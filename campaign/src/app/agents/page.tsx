import { Markdown } from "@/components/Markdown";
import { RunButton } from "@/components/RunButton";
import { AGENTS, formatDateTime } from "@/lib/constants";
import { listAgentRuns } from "@/lib/queries";

export default async function AgentsPage() {
  const runs = await listAgentRuns();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Specialised agents</h1>
        <p className="text-sm text-muted">
          Each agent is a coded specialist over the campaign database. They do not need an external model key to operate.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((agent) => (
          <article key={agent.id} className="rounded-xl border border-line bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal">{agent.name}</div>
            <h2 className="mt-1 font-semibold text-navy">{agent.role}</h2>
            <p className="mt-2 text-sm text-muted">{agent.summary}</p>
            <div className="mt-3">
              <RunButton agentId={agent.id} label={`Run ${agent.name}`} />
            </div>
          </article>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy">Recent agent output</h2>
        {runs.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">No agent runs yet.</p>
        ) : (
          runs.map((run) => (
            <article key={run.id} className="rounded-xl border border-line bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-muted">
                {run.agent_id} · {formatDateTime(run.created_at)}
              </p>
              <Markdown text={run.output_markdown} />
            </article>
          ))
        )}
      </section>
    </div>
  );
}
