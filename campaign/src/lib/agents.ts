import { sql } from "./db";
import { AGENTS, CONVERSION_GOAL, FIRM, dubaiHour, dubaiToday, formatAed } from "./constants";
import { normalizeCompany, normalizeEmail, normalizeMobile } from "./normalize";
import { campaignStats, getOverview, callerCallStats } from "./queries";

export type AgentResult = {
  agentId: string;
  title: string;
  output: string;
};

async function saveRun(agentId: string, title: string, output: string): Promise<AgentResult> {
  await sql("insert into agent_runs (agent_id, title, output_markdown) values ($1,$2,$3)", [
    agentId,
    title,
    output,
  ]);
  return { agentId, title, output };
}

function groupKeyRows<T extends { key: string; id: number }>(rows: T[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const list = map.get(row.key) ?? [];
    list.push(row.id);
    map.set(row.key, list);
  }
  return map;
}

export async function runAisha(): Promise<AgentResult> {
  const customers = await sql<{
    id: number;
    email: string;
    mobile: string;
    company_name: string;
    emirate: string;
    status: string;
  }>("select id, email, mobile, company_name, emirate, status from customers where status <> 'duplicate'");

  await sql("delete from duplicate_members");
  await sql("delete from duplicate_groups");

  const emailGroups = groupKeyRows(
    customers.map((c) => ({ id: c.id, key: `email:${normalizeEmail(c.email)}` })),
  );
  const mobileGroups = groupKeyRows(
    customers.map((c) => ({ id: c.id, key: `mobile:${normalizeMobile(c.mobile)}` })),
  );
  const companyGroups = groupKeyRows(
    customers.map((c) => ({
      id: c.id,
      key: `company:${normalizeCompany(c.company_name)}|${c.emirate.toLowerCase()}`,
    })),
  );

  type Found = { type: string; key: string; confidence: string; ids: number[] };
  const found: Found[] = [];
  const seen = new Set<string>();

  function add(type: string, key: string, confidence: string, ids: number[]) {
    const unique = [...new Set(ids)].sort((a, b) => a - b);
    if (unique.length < 2) return;
    const sig = `${type}:${unique.join(",")}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    found.push({ type, key, confidence, ids: unique });
  }

  for (const [key, ids] of emailGroups) if (ids.length > 1) add("email", key, "high", ids);
  for (const [key, ids] of mobileGroups) if (ids.length > 1) add("mobile", key, "high", ids);
  for (const [key, ids] of companyGroups) {
    const name = key.slice("company:".length).split("|")[0] ?? "";
    if (name.length < 8) continue;
    if (ids.length > 1) add("company", key, "medium", ids);
  }

  for (const group of found) {
    const inserted = await sql<{ id: number }>(
      "insert into duplicate_groups (match_type, match_key, confidence, status, notes) values ($1,$2,$3,'open',$4) returning id",
      [
        group.type,
        group.key,
        group.confidence,
        `${group.ids.length} records share this ${group.type}`,
      ],
    );
    const groupId = inserted[0]!.id;
    for (const customerId of group.ids) {
      await sql("insert into duplicate_members (group_id, customer_id) values ($1,$2) on conflict do nothing", [
        groupId,
        customerId,
      ]);
    }
  }

  const high = found.filter((g) => g.confidence === "high").length;
  const medium = found.filter((g) => g.confidence === "medium").length;
  const output = `# Aisha — duplicate sweep

Scanned **${customers.length.toLocaleString()}** active customer records.

| Match type | Groups |
| --- | --- |
| Email (high confidence) | ${found.filter((g) => g.type === "email").length} |
| Mobile (high confidence) | ${found.filter((g) => g.type === "mobile").length} |
| Same company + emirate (medium) | ${found.filter((g) => g.type === "company").length} |
| **Total open groups** | **${found.length}** |

High-confidence groups: ${high}. Medium-confidence groups: ${medium}.

## What callers should do

Do not dial a company until the open high-confidence group is merged or dismissed. Omar will skip records already marked \`duplicate\` on the next allocation run.

## Suggested merge rule

Keep the lowest customer ID as the surviving record. Carry forward the richest contact name, the working mobile, and any \`interested\` / \`converted\` status.
`;
  return saveRun("aisha", "Duplicate identification sweep", output);
}

export async function mergeDuplicateGroup(groupId: number): Promise<void> {
  const members = await sql<{ customer_id: number }>(
    "select customer_id from duplicate_members where group_id = $1 order by customer_id",
    [groupId],
  );
  if (members.length < 2) {
    await sql("update duplicate_groups set status = 'merged' where id = $1", [groupId]);
    return;
  }
  const survivor = members[0]!.customer_id;
  const extras = members.slice(1).map((m) => m.customer_id);
  await sql(
    `update customers
        set status = 'duplicate',
            duplicate_of = $1,
            notes = coalesce(notes,'') || ' Merged into #' || $1::text
      where id = any($2::int[])`,
    [survivor, extras],
  );
  await sql("update duplicate_groups set status = 'merged', notes = 'Merged into customer #' || $1::text where id = $2", [
    survivor,
    groupId,
  ]);
}

export async function dismissDuplicateGroup(groupId: number): Promise<void> {
  await sql("update duplicate_groups set status = 'dismissed' where id = $1", [groupId]);
}

export async function allocateToday(force = false) {
  const today = dubaiToday();
  const existing = await sql<{ n: number }>(
    "select count(*)::int as n from allocations where allocation_date = $1::date",
    [today],
  );
  if ((existing[0]?.n ?? 0) > 0 && !force) {
    return { date: today, created: 0, reused: existing[0]!.n };
  }
  if (force) {
    await sql("delete from allocations where allocation_date = $1::date and status = 'pending'", [today]);
  }

  const callers = await sql<{
    id: string;
    name: string;
    emirate: string;
    daily_capacity: number;
  }>("select id, name, emirate, daily_capacity from callers where active = true order by id");

  const already = await sql<{ customer_id: number }>(
    "select customer_id from allocations where allocation_date = $1::date",
    [today],
  );
  const skip = new Set(already.map((r) => r.customer_id));

  const pool = await sql<{
    id: number;
    emirate: string;
    score: number;
    status: string;
  }>(
    `select id, emirate, score, status
       from customers
      where status in ('new','callback','interested','registered')
        and duplicate_of is null
        and status <> 'duplicate'
      order by case status when 'interested' then 0 when 'callback' then 1 when 'registered' then 2 else 3 end,
               score desc, id asc
      limit 3000`,
  );

  const buckets = new Map<string, typeof pool>();
  for (const caller of callers) buckets.set(caller.id, []);

  const leftover: typeof pool = [];
  for (const customer of pool) {
    if (skip.has(customer.id)) continue;
    const home = callers.find((c) => c.emirate === customer.emirate && (buckets.get(c.id)?.length ?? 0) < c.daily_capacity);
    if (home) buckets.get(home.id)!.push(customer);
    else leftover.push(customer);
  }
  for (const customer of leftover) {
    const open = callers.find((c) => (buckets.get(c.id)?.length ?? 0) < c.daily_capacity);
    if (!open) break;
    buckets.get(open.id)!.push(customer);
  }

  const allocationRows: unknown[][] = [];
  for (const caller of callers) {
    const list = buckets.get(caller.id) ?? [];
    const ids = list.map((c) => c.id);
    for (const customer of list) {
      const priority =
        customer.status === "interested" || customer.score >= 90
          ? "hot"
          : customer.status === "callback" || customer.status === "registered"
            ? "warm"
            : "new";
      allocationRows.push([today, caller.id, customer.id, priority, "pending"]);
    }
    if (ids.length > 0) {
      await sql(
        `update customers
            set assigned_caller_id = $1,
                status = case when status = 'new' then 'allocated' else status end
          where id = any($2::int[])`,
        [caller.id, ids],
      );
    }
  }
  const chunk = 150;
  for (let i = 0; i < allocationRows.length; i += chunk) {
    const slice = allocationRows.slice(i, i + chunk);
    const placeholders = slice
      .map((row, rowIndex) => {
        const base = rowIndex * row.length;
        return `($${base + 1}::date,$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
      })
      .join(",");
    await sql(
      `insert into allocations (allocation_date, caller_id, customer_id, priority, status)
       values ${placeholders}
       on conflict (allocation_date, customer_id) do nothing`,
      slice.flat(),
    );
  }
  return {
    date: today,
    created: allocationRows.length,
    reused: 0,
    perCaller: callers.map((c) => ({ id: c.id, name: c.name, count: buckets.get(c.id)?.length ?? 0 })),
  };
}

export async function runOmar(force = false): Promise<AgentResult> {
  const result = await allocateToday(force);
  const lines = (result.perCaller ?? []).map((c) => `| ${c.name} | ${c.count} |`).join("\n");
  const output = `# Omar — daily lead allocation

**Date (Asia/Dubai):** ${result.date}

${result.created === 0 ? `Today's workbook already exists (**${result.reused}** leads). Re-run with force to rebuild pending rows.` : `Allocated **${result.created}** leads across six callers.`}

| Caller | Leads today |
| --- | --- |
${lines}

## Allocation rules

1. Skip records Aisha has marked as duplicate.
2. Prefer the caller's home emirate.
3. Fill leftover capacity from the national pool.
4. Priority: interested / score ≥ 90 = hot, callback & registered = warm, others = new.

Download the Excel workbook from Lead Allocation. Each caller has a sheet with company, contact, mobile, ERP, turnover and the script cue.
`;
  return saveRun("omar", `Lead allocation ${result.date}`, output);
}

export async function runLayla(): Promise<AgentResult> {
  const today = dubaiToday();
  const stats = await callerCallStats(today);
  const [totals] = await sql<{ calls: number; connected: number }>(
    `select count(*)::int as calls,
            count(*) filter (where outcome in ('connected','interested','registered','converted','callback'))::int as connected
       from call_logs
      where called_at::date = $1::date`,
    [today],
  );
  const calls = totals?.calls ?? 0;
  const connected = totals?.connected ?? 0;
  const rate = calls === 0 ? 0 : Math.round((connected / calls) * 100);
  const table = stats
    .map((s) => `| ${s.caller_name} | ${s.calls} | ${s.connected} | ${s.interested} | ${s.registered} | ${s.converted} |`)
    .join("\n");
  const output = `# Layla — daily calling report

**Date:** ${today}

Calls logged today: **${calls}**. Connect-class outcomes: **${connected}** (${rate}%).

| Caller | Calls | Connected class | Interested | Registered | Converted |
| --- | --- | --- | --- | --- | --- |
${table}

## Scripts in force

**Readiness webinar (Campaign 1)**  
Open with the 25 November session. If turnover is AED 50 million or above, book the diagnostic before ending the call.

**Implementation webinar (Campaign 2)**  
Use only for SAP / Oracle / Dynamics / Odoo accounts, or for companies that already attended webinar 1.

**Breakfast invitation (Campaign 3)**  
One seat per qualified company. Do not invite a duplicate group company.

## Coaching notes

${calls === 0 ? "No calls have been logged yet today. Start from the Excel list Omar issued this morning." : "Keep callbacks in the same caller queue. Do not reallocate a warm lead mid-afternoon."}
`;
  return saveRun("layla", `Calling report ${today}`, output);
}

export async function runNoor(): Promise<AgentResult> {
  const campaigns = await sql<{
    id: string;
    name: string;
    goal_registrations: number;
    goal_conversions: number;
    status: string;
    plan_markdown: string;
  }>("select id, name, goal_registrations, goal_conversions, status, plan_markdown from campaigns order by start_date");

  const blocks: string[] = [];
  for (const campaign of campaigns) {
    const stats = await campaignStats(campaign.id);
    const regPct = Math.round((stats.registered / campaign.goal_registrations) * 100);
    const convPct = Math.round((stats.converted / campaign.goal_conversions) * 100);
    blocks.push(`## ${campaign.name}

Status: **${campaign.status}**. Assigned records: ${stats.assigned.toLocaleString()}.
Registrations ${stats.registered}/${campaign.goal_registrations} (${regPct}%).
Attributed conversions ${stats.converted}/${campaign.goal_conversions} (${convPct}%).
`);
  }

  const output = `# Noor — three campaign plans

The plans below remain the operating documents. Live numbers are current as of ${dubaiToday()}.

${blocks.join("\n")}

Open Campaigns in the command centre to read the full plan for each motion: readiness webinar, implementation webinar, and the Ajman business breakfast.
`;
  return saveRun("noor", "Campaign plan status", output);
}

function proposalBody(customer: {
  company_name: string;
  contact_name: string;
  designation: string;
  emirate: string;
  turnover: string;
  erp: string;
  sector: string;
}): { title: string; service: string; body: string } {
  const high = customer.turnover.startsWith("AED 100");
  const mid = customer.turnover.startsWith("AED 50");
  const heavyErp = ["SAP", "Oracle", "Microsoft Dynamics"].includes(customer.erp);
  const service = heavyErp || high ? "Full e-invoicing transformation" : mid ? "ASP advisory retainer" : "E-invoicing readiness review";
  const fee = service.startsWith("Full") ? "AED 75,000" : service.startsWith("ASP") ? "AED 45,000" : "AED 8,500";
  const title = `${service} — ${customer.company_name}`;
  const body = `# Proposal

**From:** ${FIRM}  
**To:** ${customer.contact_name}, ${customer.designation}, ${customer.company_name}  
**Emirate:** ${customer.emirate}  
**Sector:** ${customer.sector}

## Understanding of your position

${customer.company_name} currently runs **${customer.erp}** and reports turnover in the **${customer.turnover}** band. UAE e-invoicing will require structured invoice data, VAT mapping, and a licensed Access Point / ASP. Remaining on the current process without a documented path creates filing and counterpartyrisk once counterparties begin sending Peppol invoices.

## Recommended engagement

**${service}** (${fee})

1. Readiness diagnostic: invoice sample, master data, VAT codes, ERP fields.
2. ASP / Access Point options with a scored recommendation.
3. ERP mapping for ${customer.erp}, including gaps that need a connector or manual control.
4. 90-day implementation calendar with RACI for finance and IT.
5. Knowledge transfer for the accounts team in ${customer.emirate}.

## Commercials

Fee: **${fee}**, excluding VAT. Validity: 30 days. Work starts after written acceptance.

## Next step

Confirm a 45-minute diagnostic. Attendance at the ADS webinars (25 November and 16 December 2026) and the CFO breakfast on 21 January 2027 at Bahi Ajman Palace Hotel is included for the named contact.

Prepared by Faris, Proposal Agent, for ${FIRM}.
`;
  return { title, service, body };
}

export async function runFaris(customerId?: number): Promise<AgentResult> {
  const targets = customerId
    ? await sql<{
        id: number;
        company_name: string;
        contact_name: string;
        designation: string;
        emirate: string;
        turnover: string;
        erp: string;
        sector: string;
      }>("select id, company_name, contact_name, designation, emirate, turnover, erp, sector from customers where id = $1", [
        customerId,
      ])
    : await sql<{
        id: number;
        company_name: string;
        contact_name: string;
        designation: string;
        emirate: string;
        turnover: string;
        erp: string;
        sector: string;
      }>(
        `select id, company_name, contact_name, designation, emirate, turnover, erp, sector
           from customers
          where status in ('interested','registered')
            and id not in (select customer_id from proposals)
          order by score desc
          limit 5`,
      );

  if (targets.length === 0) {
    return saveRun("faris", "Proposal queue empty", "# Faris\n\nNo qualified companies are waiting for a proposal. Mark more records as interested, or open a customer and request a proposal.");
  }

  const made: string[] = [];
  for (const customer of targets) {
    const draft = proposalBody(customer);
    await sql(
      "insert into proposals (customer_id, title, service_line, body_markdown, status) values ($1,$2,$3,$4,'draft')",
      [customer.id, draft.title, draft.service, draft.body],
    );
    made.push(`- ${customer.company_name}: ${draft.service}`);
  }

  const output = `# Faris — proposal generation

Drafted **${targets.length}** proposal${targets.length === 1 ? "" : "s"}:

${made.join("\n")}

Open Proposals to review, copy, or mark as sent. Packages follow the Campaign 2 rate card (readiness AED 8,500 → full transformation AED 75,000).
`;
  return saveRun("faris", `Proposals drafted (${targets.length})`, output);
}

export async function generateDailyReport(slot: "morning" | "afternoon"): Promise<AgentResult> {
  const overview = await getOverview();
  const today = overview.today;
  const stats = await callerCallStats(today);
  const table = stats
    .map((s) => `| ${s.caller_name} | ${s.calls} | ${s.interested} | ${s.converted} |`)
    .join("\n");

  let body: string;
  if (slot === "morning") {
    body = `# Hana — morning briefing

**${today} · Asia/Dubai**

Good morning. Conversion stand: **${overview.convertedCount.toLocaleString()} / ${CONVERSION_GOAL.toLocaleString()}** (${overview.conversionPct}%). Gap: **${overview.conversionGap.toLocaleString()}** companies.

## Today's priorities

1. Omar issues the Excel lists if today's allocation is still ${overview.todayAllocations === 0 ? "**not built**" : `in place (${overview.todayAllocations} leads)`}.
2. Aisha has **${overview.openDuplicates}** open duplicate groups — merge high-confidence email/mobile matches before first dial.
3. Campaign 1 webinar (25 November) is the primary invite. Breakfast seats stay scarce.

## Book snapshot

| Metric | Value |
| --- | --- |
| Customer records | ${overview.customerCount.toLocaleString()} |
| Pipeline (interested / registered / callback) | ${overview.pipeline.toLocaleString()} |
| Proposals on file | ${overview.proposalCount.toLocaleString()} |
| Conversion value | ${formatAed(overview.conversionValue)} |
| Calls already today | ${overview.todayCalls} |

## Events

${overview.events.map((e) => `- ${e.name}: ${e.registered}/${e.capacity} registered`).join("\n")}
`;
  } else {
    body = `# Hana — afternoon wrap-up

**${today} · Asia/Dubai**

Conversions remain **${overview.convertedCount.toLocaleString()} / ${CONVERSION_GOAL.toLocaleString()}**. ${overview.conversionGap.toLocaleString()} to go.

## Calling desk today

| Caller | Calls | Interested | Converted |
| --- | --- | --- | --- |
${table}

Calls logged today: **${overview.todayCalls}**.

## Carry into tomorrow

- Leave pending allocations in the same caller sheet; do not reshuffle warm leads.
- Faris should clear any interested company still without a proposal.
- Confirm webinar 1 and breakfast registrations with a WhatsApp before 18:00.

Pipeline sitting with the team: **${overview.pipeline.toLocaleString()}** companies.
`;
  }

  await sql(
    `insert into daily_reports (report_date, slot, title, body_markdown)
     values ($1::date, $2, $3, $4)
     on conflict (report_date, slot) do update set title = excluded.title, body_markdown = excluded.body_markdown, created_at = now()`,
    [today, slot, slot === "morning" ? "Morning briefing" : "Afternoon wrap-up", body],
  );
  return saveRun("hana", slot === "morning" ? `Morning briefing ${today}` : `Afternoon wrap-up ${today}`, body);
}

export async function runHana(): Promise<AgentResult> {
  return generateDailyReport(dubaiHour() < 13 ? "morning" : "afternoon");
}

export async function runAgent(agentId: string): Promise<AgentResult> {
  switch (agentId) {
    case "aisha":
      return runAisha();
    case "omar":
      return runOmar();
    case "layla":
      return runLayla();
    case "noor":
      return runNoor();
    case "faris":
      return runFaris();
    case "hana":
      return runHana();
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}

export { AGENTS };
