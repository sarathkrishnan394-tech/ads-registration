import { sql } from "./db";
import { campaignPlans } from "./campaign-plans";

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ahmed", "Mohammed", "Fatima", "Aisha", "Omar", "Layla", "Hassan", "Mariam", "Yousef", "Noor",
  "Priya", "Rohit", "Anjali", "Sanjay", "Meera", "Arun", "Kiran", "Neha", "Vikram", "Sneha",
  "John", "Sarah", "David", "Elena", "James", "Anna", "Michael", "Sofia", "Daniel", "Laura",
  "Wei", "Chen", "Mei", "Hadi", "Rania", "Tariq", "Samira", "Nabil", "Huda", "Faisal",
  "Abdullah", "Khalid", "Noura", "Sultan", "Reem", "Hamdan", "Lina", "Karim", "Dina", "Zaid",
];

const LAST = [
  "Hassan", "Khan", "Nair", "Menon", "Patel", "Sharma", "Rahman", "Ali", "Hussein", "Ibrahim",
  "Fernandes", "D'Souza", "Thomas", "George", "Williams", "Brown", "Santos", "Silva", "Costa", "Lopez",
  "Zhang", "Wang", "Alami", "Farouk", "Qureshi", "Shetty", "Pillai", "Reddy", "Nair", "Kapoor",
];

const DESIGNATIONS = [
  "Managing Director", "CEO", "CFO", "Finance Manager", "Accountant", "General Manager",
  "Owner", "Director", "Head of Finance", "ERP Manager", "Accounts Supervisor", "COO",
];

const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];
const EMIRATE_WEIGHTS = [0.42, 0.22, 0.16, 0.08, 0.05, 0.04, 0.03];

const SECTORS = [
  "Trading", "Construction", "Manufacturing", "Food & Beverage", "Professional Services",
  "Real Estate", "Logistics", "Healthcare", "Hospitality", "Retail", "IT Services", "Automotive",
];

const TURNOVER = ["Below AED 50 Million", "AED 50 Million and Above", "AED 100 Million and Above"];
const ERP = [
  "Tally", "Zoho Books", "QuickBooks", "SAP", "Oracle", "Microsoft Dynamics", "Odoo", "Sage",
  "Other", "Not Currently Using Any Software",
];
const SOURCES = ["Existing database", "LinkedIn", "WhatsApp", "Referral", "ADS team", "Event list"];
const PREFIX = ["Al", "Gulf", "Emirates", "Oasis", "Horizon", "Pearl", "Falcon", "Union", "Prime", "Star", "Golden", "United", "Metro", "Apex", "Nova"];
const CORE = [
  "Trading", "Contracting", "Electromechanical", "Foodstuff", "Textiles", "Steel", "Logistics",
  "Interiors", "Pharmacy", "Holdings", "Engineering", "Marine", "Auto", "Plastics", "Packaging",
  "Cables", "Hardware", "Furniture", "Cooling", "Print",
];
const SUFFIX = ["LLC", "LLC", "LLC", "FZE", "FZ-LLC", "Co. LLC"];

const CALLERS = [
  { id: "priya", name: "Priya Nair", email: "priya.nair@adsauditors.com", phone: "+971 50 111 2001", emirate: "Dubai", daily_capacity: 80 },
  { id: "ahmed", name: "Ahmed Hassan", email: "ahmed.hassan@adsauditors.com", phone: "+971 50 111 2002", emirate: "Abu Dhabi", daily_capacity: 75 },
  { id: "fatima", name: "Fatima Khan", email: "fatima.khan@adsauditors.com", phone: "+971 50 111 2003", emirate: "Sharjah", daily_capacity: 70 },
  { id: "rohit", name: "Rohit Menon", email: "rohit.menon@adsauditors.com", phone: "+971 50 111 2004", emirate: "Dubai", daily_capacity: 80 },
  { id: "sara", name: "Sara Abdullah", email: "sara.abdullah@adsauditors.com", phone: "+971 50 111 2005", emirate: "Ajman", daily_capacity: 65 },
  { id: "james", name: "James Wilson", email: "james.wilson@adsauditors.com", phone: "+971 50 111 2006", emirate: "Abu Dhabi", daily_capacity: 70 },
];

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function pickWeighted<T>(rng: () => number, list: T[], weights: number[]): T {
  let roll = rng();
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i]!;
    if (roll <= 0) return list[i]!;
  }
  return list[list.length - 1]!;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18);
}

function scoreOf(turnover: string, erp: string, emirate: string, status: string): number {
  let score = 40;
  if (turnover.startsWith("AED 100")) score += 40;
  else if (turnover.startsWith("AED 50")) score += 24;
  else score += 8;
  if (erp === "Not Currently Using Any Software") score += 18;
  else if (["SAP", "Oracle", "Microsoft Dynamics"].includes(erp)) score += 14;
  else if (erp === "Tally") score += 10;
  if (emirate === "Dubai" || emirate === "Abu Dhabi") score += 8;
  if (status === "interested") score += 20;
  if (status === "registered") score += 16;
  if (status === "callback") score += 10;
  return score;
}

async function insertChunk(table: string, columns: string[], rows: unknown[][]): Promise<void> {
  const size = 200;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const placeholders = chunk
      .map((row, rowIndex) => {
        const base = rowIndex * row.length;
        return `(${row.map((_, col) => `$${base + col + 1}`).join(",")})`;
      })
      .join(",");
    await sql(
      `insert into ${table} (${columns.join(",")}) values ${placeholders}`,
      chunk.flat(),
    );
  }
}

export async function seedDatabase(): Promise<void> {
  const rng = mulberry32(20261107);

  await insertChunk(
    "callers",
    ["id", "name", "email", "phone", "emirate", "daily_capacity", "active"],
    CALLERS.map((c) => [c.id, c.name, c.email, c.phone, c.emirate, c.daily_capacity, true]),
  );

  await insertChunk(
    "campaigns",
    [
      "id",
      "name",
      "type",
      "status",
      "start_date",
      "end_date",
      "goal_registrations",
      "goal_conversions",
      "summary",
      "plan_markdown",
    ],
    campaignPlans.map((c) => [
      c.id,
      c.name,
      c.type,
      c.status,
      c.start_date,
      c.end_date,
      c.goal_registrations,
      c.goal_conversions,
      c.summary,
      c.plan_markdown,
    ]),
  );

  await insertChunk(
    "events",
    ["id", "campaign_id", "name", "type", "event_date", "venue", "capacity", "agenda"],
    [
      [
        "webinar-1",
        "webinar-readiness",
        "UAE E-Invoicing Readiness Webinar",
        "webinar",
        "2026-11-25 11:00:00+04",
        "Microsoft Teams — ADS Virtual Studio",
        400,
        "FTA timeline, Peppol access points, invoice data quality, ASP selection checklist.",
      ],
      [
        "webinar-2",
        "webinar-implementation",
        "UAE E-Invoicing Implementation Webinar",
        "webinar",
        "2026-12-16 11:00:00+04",
        "Microsoft Teams — ADS Virtual Studio",
        350,
        "ERP mapping, VAT treatment, integration patterns, 90-day implementation plan.",
      ],
      [
        "breakfast-1",
        "cfo-breakfast",
        "CFO & Business Owners Breakfast",
        "breakfast",
        "2027-01-21 08:00:00+04",
        "Bahi Ajman Palace Hotel, Ajman",
        80,
        "Closed-door briefing for owners and CFOs, followed by one-to-one conversion meetings.",
      ],
    ],
  );

  const statuses: string[] = [];
  const customers: unknown[][] = [];
  const uniqueCount = 7750;

  for (let i = 1; i <= uniqueCount; i += 1) {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const prefix = pick(rng, PREFIX);
    const core = pick(rng, CORE);
    const suffix = pick(rng, SUFFIX);
    const token = i.toString(36).toUpperCase();
    const company = `${prefix} ${core} ${token} ${suffix}`.replace("Al Al ", "Al ");
    const emirate = pickWeighted(rng, EMIRATES, EMIRATE_WEIGHTS);
    const turnover = pickWeighted(rng, TURNOVER, [0.62, 0.24, 0.14]);
    const erp = pick(rng, ERP);
    const sector = pick(rng, SECTORS);
    const source = pick(rng, SOURCES);
    const campaign = pick(rng, campaignPlans).id;
    const roll = rng();
    let status = "new";
    if (roll > 0.88) status = "converted";
    else if (roll > 0.8) status = "registered";
    else if (roll > 0.68) status = "interested";
    else if (roll > 0.6) status = "callback";
    else if (roll > 0.48) status = "contacted";
    else if (roll > 0.4) status = "allocated";
    else if (roll > 0.36) status = "not_interested";
    const caller = status === "new" ? null : pick(rng, CALLERS).id;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@${slug(company)}.ae`;
    const mobile = `+971 5${Math.floor(rng() * 6)}${String(1000000 + i).slice(-7, -4)} ${String(1000000 + i).slice(-4)}`;
    const score = scoreOf(turnover, erp, emirate, status);
    statuses[i] = status;
    customers.push([
      i,
      company,
      `${first} ${last}`,
      pick(rng, DESIGNATIONS),
      email,
      mobile,
      emirate,
      sector,
      turnover,
      erp,
      source,
      status,
      score,
      campaign,
      caller,
      status === "new" ? null : `2026-10-${String(8 + Math.floor(rng() * 20)).padStart(2, "0")} 10:00:00+04`,
      null,
      null,
    ]);
  }

  const duplicatePairs: Array<{ original: number; type: "email" | "mobile" | "company" }> = [];
  for (let d = 0; d < 250; d += 1) {
    const original = 20 + Math.floor(rng() * 7000);
    const type = d < 100 ? "email" : d < 180 ? "mobile" : "company";
    duplicatePairs.push({ original, type });
    const base = customers[original - 1]!;
    const id = uniqueCount + d + 1;
    const clone = [...base];
    clone[0] = id;
    clone[11] = "new";
    clone[14] = null;
    clone[15] = null;
    if (type === "email") {
      clone[2] = `${String(base[2])} (Accounts)`;
      clone[3] = "Accountant";
      clone[5] = `+971 50 ${String(2000000 + d).slice(0, 3)} ${String(2000000 + d).slice(3)}`;
    } else if (type === "mobile") {
      clone[1] = `${String(base[1]).replace(" LLC", "").replace(" FZE", "")} FZ-LLC`;
      clone[4] = `accounts${id}@${slug(String(clone[1]))}.ae`;
    } else {
      clone[2] = pick(rng, FIRST) + " " + pick(rng, LAST);
      clone[4] = `info${id}@${slug(String(base[1]))}.ae`;
      clone[5] = `+971 56 ${String(3000000 + d).slice(0, 3)} ${String(3000000 + d).slice(3)}`;
    }
    clone[12] = scoreOf(String(clone[8]), String(clone[9]), String(clone[6]), "new");
    statuses[id] = "new";
    customers.push(clone);
  }

  await insertChunk(
    "customers",
    [
      "id",
      "company_name",
      "contact_name",
      "designation",
      "email",
      "mobile",
      "emirate",
      "sector",
      "turnover",
      "erp",
      "source",
      "status",
      "score",
      "campaign_id",
      "assigned_caller_id",
      "last_contacted_at",
      "notes",
      "duplicate_of",
    ],
    customers,
  );

  const convertedIds = customers.filter((row) => row[11] === "converted").map((row) => Number(row[0]));
  const registeredIds = customers.filter((row) => row[11] === "registered" || row[11] === "converted").map((row) => Number(row[0]));
  const contactedIds = customers
    .filter((row) => ["contacted", "callback", "interested", "registered", "converted", "not_interested"].includes(String(row[11])))
    .map((row) => Number(row[0]));

  const conversionRows = convertedIds.slice(0, 180).map((id) => {
    const pkg = pick(rng, [
      ["E-invoicing readiness review", 8500],
      ["Implementation support", 25000],
      ["ASP advisory retainer", 45000],
      ["Full e-invoicing transformation", 75000],
    ] as const);
    return [
      id,
      pkg[0],
      pkg[1],
      `2026-10-${String(1 + Math.floor(rng() * 28)).padStart(2, "0")} 12:00:00+04`,
      "Seeded conversion from the existing database campaign.",
    ];
  });
  await insertChunk(
    "conversions",
    ["customer_id", "service_line", "value_aed", "converted_at", "notes"],
    conversionRows,
  );

  const eventRows: unknown[][] = [];
  const webinar1 = registeredIds.slice(0, 320);
  const webinar2 = registeredIds.slice(320, 630);
  const breakfast = registeredIds.slice(630, 698);
  for (const id of webinar1) eventRows.push(["webinar-1", id, 1 + Math.floor(rng() * 3)]);
  for (const id of webinar2) eventRows.push(["webinar-2", id, 1 + Math.floor(rng() * 3)]);
  for (const id of breakfast) eventRows.push(["breakfast-1", id, 1]);
  await insertChunk("event_registrations", ["event_id", "customer_id", "attendees"], eventRows);

  const callRows: unknown[][] = [];
  const outcomes = ["connected", "no_answer", "busy", "voicemail", "interested", "callback", "registered", "not_interested"];
  for (let i = 0; i < Math.min(1400, contactedIds.length); i += 1) {
    const id = contactedIds[i]!;
    const customer = customers[id - 1]!;
    const caller = String(customer[14] || pick(rng, CALLERS).id);
    const day = 1 + (i % 20);
    callRows.push([
      id,
      caller,
      `2026-10-${String(day).padStart(2, "0")} ${String(9 + (i % 8)).padStart(2, "0")}:15:00+04`,
      pick(rng, outcomes),
      60 + Math.floor(rng() * 420),
      "Historical call from the October campaign window.",
      null,
    ]);
  }
  await insertChunk(
    "call_logs",
    ["customer_id", "caller_id", "called_at", "outcome", "duration_seconds", "notes", "next_follow_up"],
    callRows,
  );

  const proposalTargets = customers.filter((row) => row[11] === "interested").slice(0, 40);
  await insertChunk(
    "proposals",
    ["customer_id", "title", "service_line", "body_markdown", "status"],
    proposalTargets.map((row) => [
      row[0],
      `E-invoicing advisory proposal — ${row[1]}`,
      "E-invoicing advisory",
      `Draft proposal for ${row[1]} covering readiness assessment, ASP selection and ERP (${row[9]}) mapping.`,
      "draft",
    ]),
  );
}
