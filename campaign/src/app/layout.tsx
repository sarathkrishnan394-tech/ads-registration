import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { viewer } from "@/lib/viewer";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADS Campaign Command Centre",
  description:
    "Campaign operations for ADS International Auditors LLC: 8,000-company database, six specialised agents, daily Excel allocation, events and conversion tracking.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const person = await viewer();
  return (
    <html lang="en">
      <body>
        <Shell viewerName={person.name} simulated={person.simulated}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
