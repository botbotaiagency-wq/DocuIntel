/**
 * Check if DocuIntel tables exist in the database (e.g. Supabase).
 * Run: npx tsx scripts/check-db.ts
 * Requires DATABASE_URL in .env or environment.
 */
import "dotenv/config";
import pg from "pg";

const EXPECTED_TABLES = [
  "users",
  "sessions",
  "orgs",
  "user_profiles",
  "documents",
  "extractions",
  "audit_events",
  "document_schemas",
  "document_annotations",
  "conversations",
  "messages",
];

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error("DATABASE_URL or POSTGRES_URL is not set. Add it to .env or set the env var.");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
       ORDER BY table_name`
    );
    const existing = new Set(result.rows.map((r: { table_name: string }) => r.table_name));

    console.log("Tables in database (public schema):");
    if (existing.size === 0) {
      console.log("  (none)");
    } else {
      for (const name of [...existing].sort()) {
        console.log("  -", name);
      }
    }

    const missing = EXPECTED_TABLES.filter((t) => !existing.has(t));
    if (missing.length > 0) {
      console.log("\nMissing tables (run npm run db:push to create them):");
      missing.forEach((t) => console.log("  -", t));
      process.exit(1);
    } else {
      console.log("\nAll expected tables exist.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
