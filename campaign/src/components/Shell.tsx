import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  ["/", "Command centre"],
  ["/customers", "Customers"],
  ["/duplicates", "Duplicates"],
  ["/allocation", "Lead allocation"],
  ["/calls", "Calling desk"],
  ["/campaigns", "Campaigns"],
  ["/events", "Events"],
  ["/proposals", "Proposals"],
  ["/reports", "Reports"],
  ["/agents", "Agents"],
] as const;

export function Shell({
  children,
  viewerName,
  simulated,
}: {
  children: ReactNode;
  viewerName: string;
  simulated: boolean;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-deep text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal text-sm font-bold">ADS</span>
            <div>
              <div className="text-sm font-semibold tracking-wide">ADS Campaign Command Centre</div>
              <div className="text-xs text-teal-light/80">ADS International Auditors LLC · E-invoicing conversion</div>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-xs text-teal-light/90 sm:flex">
            <span>{viewerName}</span>
            {simulated ? <span className="rounded-full border border-white/20 px-2 py-0.5">Sample data</span> : null}
          </div>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-md border border-white/20 px-3 py-1.5 text-sm">
              Menu
            </summary>
            <nav className="absolute right-0 z-30 mt-2 flex w-56 flex-col rounded-lg border border-white/10 bg-navy-deep p-2">
              {NAV.map(([href, label]) => (
                <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm text-teal-light hover:bg-white/10">
                  {label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
        <nav className="mx-auto hidden max-w-[1400px] flex-wrap gap-1 px-3 pb-3 md:flex md:px-6">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm text-teal-light/90 hover:bg-white/10"
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
