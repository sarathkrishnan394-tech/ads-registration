import { LogCallForm } from "@/components/LogCallForm";
import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { dubaiToday } from "@/lib/constants";
import { ensureReady } from "@/lib/db";
import { listAllocations } from "@/lib/queries";

export default async function AllocationPage() {
  await ensureReady();
  const date = dubaiToday();
  const rows = await listAllocations(date);
  const byCaller = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byCaller.get(row.caller_name) ?? [];
    list.push(row);
    byCaller.set(row.caller_name, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Daily Excel lead allocation</h1>
          <p className="text-sm text-muted">
            Omar builds today&apos;s lists ({date}) by emirate and capacity. Download the workbook for the calling team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunButton allocate label="Run Omar allocation" />
          <a
            href="/api/allocation/excel"
            className="inline-flex min-h-10 items-center rounded-lg bg-navy px-4 text-sm font-semibold text-white"
          >
            Download Excel
          </a>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
          No leads allocated for today yet. Run Omar to build the six caller sheets.
        </p>
      ) : (
        [...byCaller.entries()].map(([name, leads]) => (
          <section key={name} className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-navy">
                {name} · {leads.length} leads
              </h2>
              <span className="text-xs text-muted">
                {leads.filter((l) => l.priority === "hot").length} hot · {leads.filter((l) => l.priority === "warm").length} warm
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1 font-medium">Priority</th>
                    <th className="py-1 font-medium">Company</th>
                    <th className="py-1 font-medium">Contact</th>
                    <th className="py-1 font-medium">Mobile</th>
                    <th className="py-1 font-medium">ERP</th>
                    <th className="py-1 font-medium">Score</th>
                    <th className="py-1 font-medium">Call</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 25).map((lead) => (
                    <tr key={lead.id} className="border-t border-line align-top">
                      <td className="py-2">
                        <StatusPill value={lead.priority} />
                      </td>
                      <td className="py-2">
                        {lead.company_name}
                        <div className="text-xs text-muted">{lead.emirate}</div>
                      </td>
                      <td className="py-2">{lead.contact_name}</td>
                      <td className="py-2 whitespace-nowrap">{lead.mobile}</td>
                      <td className="py-2">{lead.erp}</td>
                      <td className="py-2">{lead.score}</td>
                      <td className="py-2">
                        <LogCallForm compact customerId={lead.customer_id} callerId={lead.caller_id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length > 25 ? (
              <p className="mt-2 text-xs text-muted">Showing 25 of {leads.length} on screen. The Excel file contains the full list.</p>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
