import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
  Single place that knows about the physical database — the one central
  Postgres instance shared by all three Dipdash apps.
  Configure with DATABASE_URL (e.g. postgres://user:pass@host:5432/dipdash).
*/
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set (see .env)");
}

// Reuse the client across hot reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  __dipdashSql?: ReturnType<typeof postgres>;
};
const client = globalForDb.__dipdashSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__dipdashSql = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
