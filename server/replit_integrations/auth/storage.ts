import { users, type User, type UpsertUser } from "@shared/models/auth";
import { userProfiles } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserProfile(userId: string): Promise<{ role: string; displayName: string | null } | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserProfile(userId: string): Promise<{ role: string; displayName: string | null } | undefined> {
    const [profile] = await db.select({ role: userProfiles.role, displayName: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
