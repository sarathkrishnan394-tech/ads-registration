import { ensureReady, sql } from "./db";
import { CONVERSION_GOAL, dubaiToday } from "./constants";

export type Customer = {
  id: number;
  company_name: string;
  contact_name: string;
  designation: string;
  email: string;
  mobile: string;
  emirate: string;
  sector: string;
  turnover: string;
  erp: string;
  source: string;
  status: string;
  score: number;
  campaign_id: string | null;
  assigned_caller_id: string | null;
  last_contacted_at: string | null;
  notes: string | null;
  duplicate_of: number | null;
};

export type Caller = {
  id: string;
  name: string;
  email: string;
  phone: string;
  emirate: string;
  daily_capacity: number;
};

export async function getOverview() {
  await ensureReady();
  const today = dubaiToday();
  const [customers] = await sql<{ n: number }>("select count(*)::int as n from customers");
  const [converted] = await sql<{ n: number }>("select count(*)::int as n from conversions");
  const [openDupes] = await sql<{ n: number }>(
    "select count(*)::int as n from duplicate_groups where status = 'open'",
  );
  const [todayAlloc] = await sql<{ n: number }>(
    "select count(*)::int as n from allocations where allocation_date = $1::date",
    [today],
  );
  const [todayCalls] = await sql<{ n: number }>(
    "select count(*)::int as n from call_logs where called_at::date = $1::date",
    [today],
  );
  const [pipeline] = await sql<{ n: number }>(
    "select count(*)::int as n from customers where status in ('interested','registered','callback')",
  );
  const [proposals] = await sql<{ n: number }>("select count(*)::int as n from proposals");
  const [value] = await sql<{ n: string }>("select coalesce(sum(value_aed),0)::text as n from conversions");
  const statusRows = await sql<{ status: string; n: number }>(
    "select status, count(*)::int as n from customers group by status order by n desc",
  );
  const emirateRows = await sql<{ emirate: string; n: number }>(
    "select emirate, count(*)::int as n from customers group by emirate order by n desc",
  );
  const campaigns = await sql<{
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    goal_registrations: number;
    goal_conversions: number;
    summary: string;
  }>("select id, name, type, status, start_date::text, end_date::text, goal_registrations, goal_conversions, summary from campaigns order by start_date");
  const events = await sql<{
    id: string;
    campaign_id: string;
    name: string;
    type: string;
    event_date: string;
    venue: string;
    capacity: number;
    registered: number;
  }>(
    `select e.id, e.campaign_id, e.name, e.type, e.event_date::text as event_date, e.venue, e.capacity,
            coalesce(r.n, 0)::int as registered
       from events e
       left join (select event_id, count(*)::int as n from event_registrations group by event_id) r
         on r.event_id = e.id
      order by e.event_date`,
  );
  const callers = await sql<Caller>(
    "select id, name, email, phone, emirate, daily_capacity from callers where active = true order by name",
  );
  const convertedCount = converted?.n ?? 0;
  return {
    customerCount: customers?.n ?? 0,
    convertedCount,
    conversionGoal: CONVERSION_GOAL,
    conversionGap: Math.max(0, CONVERSION_GOAL - convertedCount),
    conversionPct: Math.round((convertedCount / CONVERSION_GOAL) * 1000) / 10,
    openDuplicates: openDupes?.n ?? 0,
    todayAllocations: todayAlloc?.n ?? 0,
    todayCalls: todayCalls?.n ?? 0,
    pipeline: pipeline?.n ?? 0,
    proposalCount: proposals?.n ?? 0,
    conversionValue: Number(value?.n ?? 0),
    statusRows,
    emirateRows,
    campaigns,
    events,
    callers,
    today,
  };
}

export async function listCustomers(opts: {
  q?: string;
  status?: string;
  emirate?: string;
  page?: number;
  pageSize?: number;
}) {
  await ensureReady();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 40;
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.q) {
    params.push(`%${opts.q.trim().toLowerCase()}%`);
    where.push(
      `(lower(company_name) like $${params.length} or lower(contact_name) like $${params.length} or lower(email) like $${params.length} or mobile like $${params.length})`,
    );
  }
  if (opts.status) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts.emirate) {
    params.push(opts.emirate);
    where.push(`emirate = $${params.length}`);
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";
  const [{ n }] = await sql<{ n: number }>(`select count(*)::int as n from customers ${clause}`, params);
  params.push(pageSize, (page - 1) * pageSize);
  const rows = await sql<Customer>(
    `select * from customers ${clause} order by score desc, id asc limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return { rows, total: n, page, pageSize, pages: Math.max(1, Math.ceil(n / pageSize)) };
}

export async function getCustomer(id: number) {
  await ensureReady();
  const rows = await sql<Customer>("select * from customers where id = $1", [id]);
  return rows[0] ?? null;
}

export async function listDuplicateGroups() {
  await ensureReady();
  const groups = await sql<{
    id: number;
    match_type: string;
    match_key: string;
    confidence: string;
    status: string;
    member_count: number;
  }>(
    `select g.id, g.match_type, g.match_key, g.confidence, g.status, count(m.customer_id)::int as member_count
       from duplicate_groups g
       join duplicate_members m on m.group_id = g.id
      group by g.id
      order by case g.status when 'open' then 0 else 1 end, g.id desc
      limit 200`,
  );
  if (groups.length === 0) return [];
  const members = await sql<{
    group_id: number;
    id: number;
    company_name: string;
    contact_name: string;
    email: string;
    mobile: string;
    emirate: string;
    status: string;
  }>(
    `select m.group_id, c.id, c.company_name, c.contact_name, c.email, c.mobile, c.emirate, c.status
       from duplicate_members m
       join customers c on c.id = m.customer_id
      where m.group_id = any($1::int[])
      order by c.id`,
    [groups.map((g) => g.id)],
  );
  return groups.map((group) => ({
    ...group,
    members: members.filter((m) => m.group_id === group.id),
  }));
}

export async function listAllocations(date: string, callerId?: string) {
  await ensureReady();
  const params: unknown[] = [date];
  let clause = "a.allocation_date = $1::date";
  if (callerId) {
    params.push(callerId);
    clause += ` and a.caller_id = $${params.length}`;
  }
  return sql<{
    id: number;
    allocation_date: string;
    caller_id: string;
    caller_name: string;
    customer_id: number;
    company_name: string;
    contact_name: string;
    mobile: string;
    email: string;
    emirate: string;
    turnover: string;
    erp: string;
    score: number;
    priority: string;
    status: string;
    customer_status: string;
  }>(
    `select a.id, a.allocation_date::text as allocation_date, a.caller_id, cr.name as caller_name,
            a.customer_id, c.company_name, c.contact_name, c.mobile, c.email, c.emirate, c.turnover,
            c.erp, c.score, a.priority, a.status, c.status as customer_status
       from allocations a
       join customers c on c.id = a.customer_id
       join callers cr on cr.id = a.caller_id
      where ${clause}
      order by cr.name, a.priority, c.score desc`,
    params,
  );
}

export async function listCallLogs(date?: string) {
  await ensureReady();
  if (date) {
    return sql<{
      id: number;
      called_at: string;
      outcome: string;
      duration_seconds: number | null;
      notes: string | null;
      caller_name: string;
      company_name: string;
      contact_name: string;
      mobile: string;
    }>(
      `select l.id, l.called_at::text as called_at, l.outcome, l.duration_seconds, l.notes, cr.name as caller_name,
              c.company_name, c.contact_name, c.mobile
         from call_logs l
         join customers c on c.id = l.customer_id
         join callers cr on cr.id = l.caller_id
        where l.called_at::date = $1::date
        order by l.called_at desc
        limit 300`,
      [date],
    );
  }
  return sql<{
    id: number;
    called_at: string;
    outcome: string;
    duration_seconds: number | null;
    notes: string | null;
    caller_name: string;
    company_name: string;
    contact_name: string;
    mobile: string;
  }>(
    `select l.id, l.called_at::text as called_at, l.outcome, l.duration_seconds, l.notes, cr.name as caller_name,
            c.company_name, c.contact_name, c.mobile
       from call_logs l
       join customers c on c.id = l.customer_id
       join callers cr on cr.id = l.caller_id
      order by l.called_at desc
      limit 200`,
  );
}

export async function callerCallStats(date: string) {
  await ensureReady();
  return sql<{
    caller_id: string;
    caller_name: string;
    calls: number;
    connected: number;
    interested: number;
    registered: number;
    converted: number;
  }>(
    `select cr.id as caller_id, cr.name as caller_name,
            count(l.id)::int as calls,
            count(*) filter (where l.outcome in ('connected','interested','registered','converted','callback'))::int as connected,
            count(*) filter (where l.outcome = 'interested')::int as interested,
            count(*) filter (where l.outcome = 'registered')::int as registered,
            count(*) filter (where l.outcome = 'converted')::int as converted
       from callers cr
       left join call_logs l on l.caller_id = cr.id and l.called_at::date = $1::date
      where cr.active = true
      group by cr.id, cr.name
      order by cr.name`,
    [date],
  );
}

export async function listProposals() {
  await ensureReady();
  return sql<{
    id: number;
    customer_id: number;
    title: string;
    service_line: string;
    body_markdown: string;
    status: string;
    created_at: string;
    company_name: string;
    contact_name: string;
  }>(
    `select p.id, p.customer_id, p.title, p.service_line, p.body_markdown, p.status, p.created_at::text as created_at,
            c.company_name, c.contact_name
       from proposals p
       join customers c on c.id = p.customer_id
      order by p.created_at desc
      limit 80`,
  );
}

export async function listReports() {
  await ensureReady();
  return sql<{
    id: number;
    report_date: string;
    slot: string;
    title: string;
    body_markdown: string;
    created_at: string;
  }>(
    `select id, report_date::text as report_date, slot, title, body_markdown, created_at
       from daily_reports
      order by report_date desc, slot desc
      limit 20`,
  );
}

export async function listAgentRuns() {
  await ensureReady();
  return sql<{
    id: number;
    agent_id: string;
    title: string;
    output_markdown: string;
    created_at: string;
  }>("select id, agent_id, title, output_markdown, created_at::text as created_at from agent_runs order by created_at desc limit 30");
}

export async function getCampaign(id: string) {
  await ensureReady();
  const rows = await sql<{
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    goal_registrations: number;
    goal_conversions: number;
    summary: string;
    plan_markdown: string;
  }>("select id, name, type, status, start_date::text, end_date::text, goal_registrations, goal_conversions, summary, plan_markdown from campaigns where id = $1", [id]);
  return rows[0] ?? null;
}

export async function campaignStats(campaignId: string) {
  await ensureReady();
  const [assigned] = await sql<{ n: number }>(
    "select count(*)::int as n from customers where campaign_id = $1",
    [campaignId],
  );
  const [registered] = await sql<{ n: number }>(
    `select count(distinct r.customer_id)::int as n
       from event_registrations r
       join events e on e.id = r.event_id
      where e.campaign_id = $1`,
    [campaignId],
  );
  const [converted] = await sql<{ n: number }>(
    `select count(*)::int as n
       from conversions v
       join customers c on c.id = v.customer_id
      where c.campaign_id = $1`,
    [campaignId],
  );
  return {
    assigned: assigned?.n ?? 0,
    registered: registered?.n ?? 0,
    converted: converted?.n ?? 0,
  };
}
