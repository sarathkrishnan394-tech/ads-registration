import Link from "next/link";
import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { AGENTS, formatAed } from "@/lib/constants";
import { getOverview } from "@/lib/queries";

export default async function HomePage() {
  const data = await getOverview();

  const kpis = [
    ["Customers", data.customerCount.toLocaleString(), "Synthetic UAE company book"],
    ["Conversions", `${data.convertedCount.toLocaleString()} / ${data.conversionGoal.toLocaleString()}`, `${data.conversionPct}% of the 1,000 goal`],
    ["Today's leads", data.todayAllocations.toLocaleString(), "Allocated for calling"],
    ["Open duplicates", data.openDuplicates.toLocaleString(), "Aisha still to review"],
    ["Pipeline", data.pipeline.toLocaleString(), "Interested, registered, callback"],
    ["Conversion value", formatAed(data.conversionValue), "Advisory fees on converted files"],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-navy px-5 py-5 text-white md:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-teal-light/80">ADS International Auditors LLC</p>
        <h1 className="mt-1 text-2xl font-semibold">E-invoicing campaign command centre</h1>
        <p className="mt-2 max-w-3xl text-sm text-teal-light/90">
          Six specialised agents run the 8,000-company book: duplicates, daily Excel lead allocation, calling
          reports, three campaign plans, two webinars, one business breakfast, proposals, and morning / afternoon
          reporting toward 1,000 conversions. Figures below are sample data until you connect a live database.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-teal" style={{ width: `${Math.min(100, data.conversionPct)}%` }} />
        </div>
        <p className="mt-2 text-xs text-teal-light/80">
          {data.conversionGap.toLocaleString()} conversions remaining · Dubai date {data.today}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(([label, value, hint]) => (
          <article key={label} className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-navy">{value}</div>
            <div className="mt-1 text-xs text-muted">{hint}</div>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-navy">Six specialised agents</h2>
            <p className="text-sm text-muted">Each agent writes to the live book. Run them in this order at the start of the day: Aisha, Omar, Hana.</p>
          </div>
          <Link href="/agents" className="text-sm font-semibold text-teal">
            Agent log
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((agent) => (
            <article key={agent.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-teal">{agent.name}</div>
              <h3 className="mt-1 text-base font-semibold text-navy">{agent.role}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{agent.summary}</p>
              <div className="mt-4">
                <RunButton agentId={agent.id} label={`Run ${agent.name}`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-base font-semibold text-navy">Three campaign plans</h2>
          <ul className="mt-3 space-y-3">
            {data.campaigns.map((campaign) => (
              <li key={campaign.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/campaigns/${campaign.id}`} className="font-medium text-navy hover:text-teal">
                    {campaign.name}
                  </Link>
                  <StatusPill value={campaign.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{campaign.summary}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-base font-semibold text-navy">Events</h2>
          <ul className="mt-3 space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-navy">{event.name}</div>
                    <div className="text-sm text-muted">{event.venue}</div>
                  </div>
                  <StatusPill value={event.type} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full bg-teal"
                    style={{ width: `${Math.min(100, Math.round((event.registered / event.capacity) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {event.registered} / {event.capacity} registered
                </p>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
