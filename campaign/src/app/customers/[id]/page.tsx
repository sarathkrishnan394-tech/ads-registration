import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftProposalButton } from "@/components/DraftProposalButton";
import { LogCallForm } from "@/components/LogCallForm";
import { Markdown } from "@/components/Markdown";
import { StatusPill } from "@/components/StatusPill";
import { formatDateTime } from "@/lib/constants";
import { ensureReady, sql } from "@/lib/db";
import { getCustomer } from "@/lib/queries";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(Number(id));
  if (!customer) notFound();
  await ensureReady();
  const calls = await sql<{ called_at: string; outcome: string; notes: string | null; caller_id: string }>(
    "select called_at::text as called_at, outcome, notes, caller_id from call_logs where customer_id = $1 order by called_at desc limit 20",
    [customer.id],
  );
  const proposals = await sql<{ id: number; title: string; body_markdown: string; status: string }>(
    "select id, title, body_markdown, status from proposals where customer_id = $1 order by created_at desc",
    [customer.id],
  );

  return (
    <div className="space-y-4">
      <Link href="/customers" className="text-sm font-semibold text-teal">
        Back to customers
      </Link>
      <div className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-navy">{customer.company_name}</h1>
            <p className="text-sm text-muted">
              {customer.contact_name} · {customer.designation}
            </p>
          </div>
          <StatusPill value={customer.status} />
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <dt className="text-muted">Mobile</dt>
            <dd>{customer.mobile}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Emirate</dt>
            <dd>{customer.emirate}</dd>
          </div>
          <div>
            <dt className="text-muted">Turnover</dt>
            <dd>{customer.turnover}</dd>
          </div>
          <div>
            <dt className="text-muted">ERP</dt>
            <dd>{customer.erp}</dd>
          </div>
          <div>
            <dt className="text-muted">Score</dt>
            <dd>{customer.score}</dd>
          </div>
        </dl>
        <div className="mt-5 space-y-3">
          <h2 className="text-sm font-semibold text-navy">Log a call</h2>
          <LogCallForm customerId={customer.id} callerId={customer.assigned_caller_id || "priya"} />
          <DraftProposalButton customerId={customer.id} />
        </div>
      </div>
      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-base font-semibold text-navy">Call history</h2>
        {calls.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No calls logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {calls.map((call, i) => (
              <li key={i} className="border-t border-line pt-2">
                {formatDateTime(call.called_at)} · {call.outcome.replaceAll("_", " ")}
                {call.notes ? ` — ${call.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
      {proposals.map((p) => (
        <section key={p.id} className="rounded-xl border border-line bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-navy">{p.title}</h2>
            <StatusPill value={p.status} />
          </div>
          <Markdown text={p.body_markdown} />
        </section>
      ))}
    </div>
  );
}
