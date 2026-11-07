import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { STATUSES } from "@/lib/constants";
import { listCustomers } from "@/lib/queries";

function emirates() {
  return ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"];
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; emirate?: string; page?: string }>;
}) {
  const params = await searchParams;
  const data = await listCustomers({
    q: params.q,
    status: params.status,
    emirate: params.emirate,
    page: Number(params.page || 1),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Customer database</h1>
        <p className="text-sm text-muted">
          {data.total.toLocaleString()} sample UAE companies. Search, filter, then send qualified records to Faris for a proposal.
        </p>
      </div>
      <form className="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3" action="/customers">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search company, contact, email or mobile"
          className="min-h-10 min-w-56 flex-1 rounded-md border border-line px-3 text-sm"
        />
        <select name="status" defaultValue={params.status ?? ""} className="min-h-10 rounded-md border border-line px-3 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select name="emirate" defaultValue={params.emirate ?? ""} className="min-h-10 rounded-md border border-line px-3 text-sm">
          <option value="">All emirates</option>
          {emirates().map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <button className="min-h-10 rounded-md bg-navy px-4 text-sm font-semibold text-white">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-navy text-white">
            <tr>
              {["Company", "Contact", "Mobile", "Emirate", "Turnover", "ERP", "Score", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2">
                  <Link href={`/customers/${row.id}`} className="font-medium text-navy hover:text-teal">
                    {row.company_name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {row.contact_name}
                  <div className="text-xs text-muted">{row.email}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.mobile}</td>
                <td className="px-3 py-2">{row.emirate}</td>
                <td className="px-3 py-2">{row.turnover.replace("AED ", "")}</td>
                <td className="px-3 py-2">{row.erp}</td>
                <td className="px-3 py-2">{row.score}</td>
                <td className="px-3 py-2">
                  <StatusPill value={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Page {data.page} of {data.pages}
        </span>
        <div className="flex gap-2">
          {data.page > 1 ? (
            <Link
              className="rounded-md border border-line bg-white px-3 py-1.5 text-navy"
              href={`/customers?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(params.status ?? "")}&emirate=${encodeURIComponent(params.emirate ?? "")}&page=${data.page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {data.page < data.pages ? (
            <Link
              className="rounded-md border border-line bg-white px-3 py-1.5 text-navy"
              href={`/customers?q=${encodeURIComponent(params.q ?? "")}&status=${encodeURIComponent(params.status ?? "")}&emirate=${encodeURIComponent(params.emirate ?? "")}&page=${data.page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
