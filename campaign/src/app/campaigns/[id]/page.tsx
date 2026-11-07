import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { StatusPill } from "@/components/StatusPill";
import { formatDate } from "@/lib/constants";
import { campaignStats, getCampaign } from "@/lib/queries";

export default async function CampaignPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const stats = await campaignStats(campaign.id);

  return (
    <div className="space-y-4">
      <Link href="/campaigns" className="text-sm font-semibold text-teal">
        Back to campaigns
      </Link>
      <article className="rounded-xl border border-line bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy">{campaign.name}</h1>
            <p className="text-sm text-muted">
              {formatDate(campaign.start_date)} → {formatDate(campaign.end_date)} · registrations {stats.registered}/
              {campaign.goal_registrations} · conversions {stats.converted}/{campaign.goal_conversions}
            </p>
          </div>
          <StatusPill value={campaign.status} />
        </div>
        <Markdown text={campaign.plan_markdown} />
      </article>
    </div>
  );
}
