import Link from "next/link";
import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { campaignStats, getOverview } from "@/lib/queries";

export default async function CampaignsPage() {
  const overview = await getOverview();
  const withStats = await Promise.all(
    overview.campaigns.map(async (campaign) => ({ campaign, stats: await campaignStats(campaign.id) })),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Three campaign plans</h1>
          <p className="text-sm text-muted">
            Noor keeps readiness webinar, implementation webinar and the Ajman breakfast aligned to the 1,000-conversion goal.
          </p>
        </div>
        <RunButton agentId="noor" label="Run Noor update" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {withStats.map(({ campaign, stats }) => (
          <article key={campaign.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-navy">{campaign.name}</h2>
              <StatusPill value={campaign.status} />
            </div>
            <p className="mt-2 flex-1 text-sm text-muted">{campaign.summary}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md bg-paper p-2">
                <dt className="text-xs text-muted">Assigned</dt>
                <dd className="font-semibold text-navy">{stats.assigned.toLocaleString()}</dd>
              </div>
              <div className="rounded-md bg-paper p-2">
                <dt className="text-xs text-muted">Registered</dt>
                <dd className="font-semibold text-navy">
                  {stats.registered}/{campaign.goal_registrations}
                </dd>
              </div>
              <div className="rounded-md bg-paper p-2">
                <dt className="text-xs text-muted">Converted</dt>
                <dd className="font-semibold text-navy">
                  {stats.converted}/{campaign.goal_conversions}
                </dd>
              </div>
            </dl>
            <Link href={`/campaigns/${campaign.id}`} className="mt-4 text-sm font-semibold text-teal">
              Open full plan
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
