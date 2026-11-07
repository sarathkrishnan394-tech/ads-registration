import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type GlobalDb = {
  adsPool?: pg.Pool;
  adsLocal?: Promise<PGlite>;
  adsReady?: Promise<void>;
};

const globalForDb = globalThis as typeof globalThis & GlobalDb;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    globalForDb.adsPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await globalForDb.adsPool.query(text, params)).rows as T[];
  }
  globalForDb.adsLocal ??= startLocal().catch((error: unknown) => {
    globalForDb.adsLocal = undefined;
    throw error;
  });
  return (await (await globalForDb.adsLocal).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const dir = path.join(process.cwd(), "migrations");
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(path.join(dir, file), "utf8"));
  }
  return db;
}

export async function ensureReady(): Promise<void> {
  if (!globalForDb.adsReady) {
    globalForDb.adsReady = (async () => {
      if (databaseUrl !== "") {
        const migrated = await sql<{ exists: boolean }>(
          "select exists (select 1 from information_schema.tables where table_name = 'customers') as exists",
        );
        if (!migrated[0]?.exists) {
          const dir = path.join(process.cwd(), "migrations");
          const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".sql")).sort();
          for (const file of files) {
            const body = await readFile(path.join(dir, file), "utf8");
            await sql(body);
          }
        }
      }
      const rows = await sql<{ n: number }>("select count(*)::int as n from customers");
      if ((rows[0]?.n ?? 0) === 0) {
        const { seedDatabase } = await import("./seed");
        await seedDatabase();
      }
    })().catch((error: unknown) => {
      globalForDb.adsReady = undefined;
      throw error;
    });
  }
  await globalForDb.adsReady;
}
