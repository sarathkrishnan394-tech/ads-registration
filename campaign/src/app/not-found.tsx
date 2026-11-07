import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-line bg-white p-8">
      <h1 className="text-xl font-semibold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That record or route is not in the campaign command centre.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-semibold text-teal">
        Back to command centre
      </Link>
    </div>
  );
}
