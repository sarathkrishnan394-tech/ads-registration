import { DuplicateActions } from "@/components/DuplicateActions";
import { RunButton } from "@/components/RunButton";
import { StatusPill } from "@/components/StatusPill";
import { listDuplicateGroups } from "@/lib/queries";

export default async function DuplicatesPage() {
  const groups = await listDuplicateGroups();
  const open = groups.filter((g) => g.status === "open").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Duplicate identification</h1>
          <p className="text-sm text-muted">
            Aisha matches email, mobile and normalised company name plus emirate. {open} groups are still open.
          </p>
        </div>
        <RunButton agentId="aisha" label="Run Aisha sweep" />
      </div>
      {groups.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
          No duplicate groups yet. Run Aisha to scan the 8,000-record book.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <article key={group.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusPill value={group.confidence} />
                  <StatusPill value={group.status} />
                  <span className="text-sm text-muted">
                    {group.match_type} · {group.member_count} records
                  </span>
                </div>
                {group.status === "open" ? <DuplicateActions groupId={group.id} /> : null}
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="py-1 font-medium">ID</th>
                      <th className="py-1 font-medium">Company</th>
                      <th className="py-1 font-medium">Contact</th>
                      <th className="py-1 font-medium">Email</th>
                      <th className="py-1 font-medium">Mobile</th>
                      <th className="py-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((m) => (
                      <tr key={m.id} className="border-t border-line">
                        <td className="py-1.5">{m.id}</td>
                        <td className="py-1.5">{m.company_name}</td>
                        <td className="py-1.5">{m.contact_name}</td>
                        <td className="py-1.5">{m.email}</td>
                        <td className="py-1.5 whitespace-nowrap">{m.mobile}</td>
                        <td className="py-1.5">
                          <StatusPill value={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
