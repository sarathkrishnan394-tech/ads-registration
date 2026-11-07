import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { dubaiToday, formatDateTime } from "@/lib/constants";
import { callerCallStats, listCallLogs } from "@/lib/queries";

export default async function CallsPage() {
  const today = dubaiToday();
  const [stats, logs] = await Promise.all([callerCallStats(today), listCallLogs()]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Calling desk</h1>
          <p className="text-sm text-muted">Layla compiles today&apos;s calling report. Log outcomes from Lead allocation or a customer record.</p>
        </div>
        <RunButton agentId="layla" label="Run Layla report" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {["Caller", "Calls today", "Connected class", "Interested", "Registered", "Converted"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.caller_id} className="border-t border-line">
                <td className="px-3 py-2">{row.caller_name}</td>
                <td className="px-3 py-2">{row.calls}</td>
                <td className="px-3 py-2">{row.connected}</td>
                <td className="px-3 py-2">{row.interested}</td>
                <td className="px-3 py-2">{row.registered}</td>
                <td className="px-3 py-2">{row.converted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-base font-semibold text-navy">Recent calls</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1 font-medium">When</th>
                <th className="py-1 font-medium">Caller</th>
                <th className="py-1 font-medium">Company</th>
                <th className="py-1 font-medium">Outcome</th>
                <th className="py-1 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line">
                  <td className="py-2 whitespace-nowrap">{formatDateTime(log.called_at)}</td>
                  <td className="py-2">{log.caller_name}</td>
                  <td className="py-2">
                    {log.company_name}
                    <div className="text-xs text-muted">{log.mobile}</div>
                  </td>
                  <td className="py-2">
                    <StatusPill value={log.outcome} />
                  </td>
                  <td className="py-2 text-muted">{log.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
