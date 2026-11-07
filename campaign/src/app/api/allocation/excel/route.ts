import { NextResponse } from "next/server";
import { allocateToday } from "@/lib/agents";
import { dubaiToday } from "@/lib/constants";
import { ensureReady } from "@/lib/db";
import { toExcelXml } from "@/lib/excel";
import { listAllocations } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureReady();
  const date = dubaiToday();
  await allocateToday(false);
  const rows = await listAllocations(date);
  const callers = [...new Map(rows.map((r) => [r.caller_id, r.caller_name])).entries()];
  const headers = [
    "Priority",
    "Company",
    "Contact",
    "Mobile",
    "Email",
    "Emirate",
    "Turnover",
    "ERP",
    "Score",
    "Status",
    "Script cue",
  ];
  const sheets = [
    {
      name: "Summary",
      headers: ["Caller", "Leads", "Hot", "Warm", "New"],
      rows: callers.map(([id, name]) => {
        const mine = rows.filter((r) => r.caller_id === id);
        return [
          name,
          String(mine.length),
          String(mine.filter((r) => r.priority === "hot").length),
          String(mine.filter((r) => r.priority === "warm").length),
          String(mine.filter((r) => r.priority === "new").length),
        ];
      }),
    },
    ...callers.map(([id, name]) => ({
      name,
      headers,
      rows: rows
        .filter((r) => r.caller_id === id)
        .map((r) => [
          r.priority,
          r.company_name,
          r.contact_name,
          r.mobile,
          r.email,
          r.emirate,
          r.turnover,
          r.erp,
          String(r.score),
          r.customer_status,
          r.priority === "hot"
            ? "Implementation / diagnostic"
            : r.priority === "warm"
              ? "Confirm webinar or callback"
              : "Invite to 25 Nov readiness webinar",
        ]),
    })),
  ];
  const xml = toExcelXml(sheets);
  return new NextResponse(xml, {
    headers: {
      "content-type": "application/vnd.ms-excel; charset=utf-8",
      "content-disposition": `attachment; filename="ADS-Lead-Allocation-${date}.xls"`,
      "cache-control": "private, no-store",
    },
  });
}
