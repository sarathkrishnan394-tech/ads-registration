import { allocateToday, runAisha, runFaris, runHana, runLayla, runNoor, runOmar } from "../src/lib/agents";
import { ensureReady, sql } from "../src/lib/db";
import { toExcelXml } from "../src/lib/excel";

async function main() {
  await ensureReady();
  const [customers] = await sql<{ n: number }>("select count(*)::int as n from customers");
  if ((customers?.n ?? 0) !== 8000) {
    throw new Error(`expected 8000 customers, got ${customers?.n}`);
  }
  const [conversions] = await sql<{ n: number }>("select count(*)::int as n from conversions");
  if ((conversions?.n ?? 0) < 100) {
    throw new Error(`expected seeded conversions, got ${conversions?.n}`);
  }
  const [events] = await sql<{ n: number }>("select count(*)::int as n from events");
  if ((events?.n ?? 0) !== 3) throw new Error("expected 2 webinars and 1 breakfast");

  const aisha = await runAisha();
  const [dupes] = await sql<{ n: number }>("select count(*)::int as n from duplicate_groups");
  if ((dupes?.n ?? 0) < 50) throw new Error(`Aisha found too few duplicate groups: ${dupes?.n}`);

  const omar = await runOmar(true);
  const [alloc] = await sql<{ n: number }>("select count(*)::int as n from allocations");
  if ((alloc?.n ?? 0) < 100) throw new Error(`Omar allocated too few leads: ${alloc?.n}`);

  const xml = toExcelXml([
    { name: "Summary", headers: ["Caller", "Leads"], rows: [["Priya Nair", "80"]] },
  ]);
  if (!xml.includes("Excel.Sheet")) throw new Error("excel xml missing workbook marker");

  const faris = await runFaris();
  const layla = await runLayla();
  const noor = await runNoor();
  const hana = await runHana();
  const extra = await allocateToday(false);

  console.log(
    JSON.stringify(
      {
        customers: customers?.n,
        conversions: conversions?.n,
        duplicateGroups: dupes?.n,
        allocations: alloc?.n,
        reusedAllocation: extra.reused,
        agents: [aisha.title, omar.title, faris.title, layla.title, noor.title, hana.title],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
