import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { listProposals } from "@/lib/queries";

export default async function ProposalsPage() {
  const proposals = await listProposals();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Proposal generation</h1>
          <p className="text-sm text-muted">
            Faris drafts e-invoicing proposals for interested and registered companies using ERP, turnover and emirate.
          </p>
        </div>
        <RunButton agentId="faris" label="Run Faris (next 5)" />
      </div>
      {proposals.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">No proposals yet.</p>
      ) : (
        proposals.map((p) => (
          <article key={p.id} className="rounded-xl border border-line bg-white p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-navy">{p.title}</h2>
                <p className="text-sm text-muted">
                  <Link href={`/customers/${p.customer_id}`} className="text-teal">
                    {p.company_name}
                  </Link>{" "}
                  · {p.contact_name} · {p.service_line}
                </p>
              </div>
              <StatusPill value={p.status} />
            </div>
            <Markdown text={p.body_markdown} />
          </article>
        ))
      )}
    </div>
  );
}
