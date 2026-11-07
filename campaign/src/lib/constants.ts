export const CONVERSION_GOAL = 1000;
export const CUSTOMER_TARGET = 8000;
export const TIMEZONE = "Asia/Dubai";
export const FIRM = "ADS International Auditors LLC";

export const AGENTS = [
  {
    id: "aisha",
    name: "Aisha",
    role: "Data Quality Agent",
    summary: "Finds duplicate companies, emails and mobile numbers across the 8,000-record book.",
  },
  {
    id: "omar",
    name: "Omar",
    role: "Lead Allocation Agent",
    summary: "Builds the daily calling lists and the Excel workbook for each telecaller.",
  },
  {
    id: "layla",
    name: "Layla",
    role: "Call Desk Agent",
    summary: "Writes daily calling reports, scripts and connect-rate analysis.",
  },
  {
    id: "noor",
    name: "Noor",
    role: "Campaign Planner",
    summary: "Owns the three campaign plans and keeps webinar and breakfast targets current.",
  },
  {
    id: "faris",
    name: "Faris",
    role: "Proposal Agent",
    summary: "Drafts e-invoicing, ASP and advisory proposals for qualified companies.",
  },
  {
    id: "hana",
    name: "Hana",
    role: "Command Centre Agent",
    summary: "Issues the morning briefing and afternoon wrap-up against the 1,000-conversion goal.",
  },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];

export const STATUSES = [
  "new",
  "allocated",
  "contacted",
  "callback",
  "interested",
  "registered",
  "converted",
  "not_interested",
  "duplicate",
] as const;

export type CustomerStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  allocated: "Allocated",
  contacted: "Contacted",
  callback: "Callback",
  interested: "Interested",
  registered: "Registered",
  converted: "Converted",
  not_interested: "Not interested",
  duplicate: "Duplicate",
  pending: "Pending",
  called: "Called",
  open: "Open",
  merged: "Merged",
  dismissed: "Dismissed",
  draft: "Draft",
  sent: "Sent",
};

export const CALL_OUTCOMES = [
  { id: "connected", label: "Connected" },
  { id: "no_answer", label: "No answer" },
  { id: "busy", label: "Busy" },
  { id: "voicemail", label: "Voicemail" },
  { id: "wrong_number", label: "Wrong number" },
  { id: "interested", label: "Interested" },
  { id: "callback", label: "Callback" },
  { id: "registered", label: "Registered for event" },
  { id: "converted", label: "Converted" },
  { id: "not_interested", label: "Not interested" },
] as const;

export function dubaiNow(): Date {
  return new Date();
}

export function dubaiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dubaiHour(): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  return Number(hour);
}

export function formatAed(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
