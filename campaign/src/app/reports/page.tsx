import { Markdown } from "@/components/Markdown";
import { RunButton } from "@/components/RunButton";
import { formatDate } from "@/lib/constants";
import { listReports } from "@/lib/queries";

export default async function ReportsPage() {
  const reports = await listReports();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Morning and afternoon reporting</h1>
          <p className="text-sm text-muted">
            Hana writes the Dubai-morning briefing and the afternoon wrap-up against the 1,000-conversion target.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunButton slot="morning" label="Morning briefing" />
          <RunButton slot="afternoon" label="Afternoon wrap-up" className="inline-flex min-h-10 items-center rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60" />
        </div>
      </div>
      {reports.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">No reports yet. Generate the morning briefing to start the day.</p>
      ) : (
        reports.map((report) => (
          <article key={report.id} className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-muted">
              {formatDate(report.report_date)} · {report.slot}
            </p>
            <Markdown text={report.body_markdown} />
          </article>
        ))
      )}
    </div>
  );
}
