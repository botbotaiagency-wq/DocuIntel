/**
 * One-time script to create a local admin user for development.
 * Run: npx tsx scripts/seed-admin.ts
 * Then log in with the username and password below (or set SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD in .env).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { users } from "../shared/models/auth";
import { userProfiles } from "../shared/schema";
import { eq } from "drizzle-orm";

const username = process.env.SEED_ADMIN_USERNAME || "admin";
const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
const displayName = process.env.SEED_ADMIN_DISPLAY_NAME || "Local Admin";
const userId = `staff_${Date.now()}`;

async function main() {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error("DATABASE_URL or POSTGRES_URL is not set. Create a .env file with one of these (and SESSION_SECRET).");
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.username, username));
  if (existing.length > 0) {
    console.log(`User "${username}" already exists. No change.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    id: userId,
    username,
    passwordHash,
    firstName: displayName,
  } as any);

  await db.insert(userProfiles).values({
    userId,
    role: "Admin",
    displayName,
  });

  console.log("Admin user created.");
  console.log("  Username:", username);
  console.log("  Password:", password);
  console.log("  Log in at http://localhost:5000 (or your PORT) using these credentials.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
