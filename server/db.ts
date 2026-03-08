import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set. In Vercel with Supabase linked, POSTGRES_URL is set automatically.",
    );
  }
  const options: pg.PoolConfig = { connectionString: url };
  if (url.includes("supabase.com") && !url.includes("sslmode=")) {
    options.ssl = { rejectUnauthorized: false };
  }
  return new Pool(options);
}

export const pool = getPool();
export const db = drizzle(pool, { schema });
