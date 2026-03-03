import { type Document, type Extraction, type AuditEvent, type DocumentSchema, type Org, type UserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { documents, extractions, auditEvents, documentSchemas, orgs, userProfiles, users } from "@shared/schema";

export interface IStorage {
  // Orgs
  getOrg(id: number): Promise<Org | undefined>;
  updateOrg(id: number, updates: Partial<Org>): Promise<Org>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  getDocumentsWithUploader(): Promise<any[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: Partial<Document>): Promise<Document>;
  updateDocumentStatus(id: number, status: string): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // Extractions
  getLatestExtraction(documentId: number): Promise<Extraction | undefined>;
  createExtraction(extraction: Partial<Extraction>): Promise<Extraction>;
  updateExtraction(id: number, updates: Partial<Extraction>): Promise<Extraction>;

  // Audit
  getAuditEvents(): Promise<AuditEvent[]>;
  createAuditEvent(event: Partial<AuditEvent>): Promise<AuditEvent>;

  // Schemas
  getSchemas(): Promise<DocumentSchema[]>;
  getSchema(id: number): Promise<DocumentSchema | undefined>;
  createSchema(schema: Partial<DocumentSchema>): Promise<DocumentSchema>;
  updateSchema(id: number, updates: Partial<DocumentSchema>): Promise<DocumentSchema>;

  // User Profiles
  getUserProfiles(): Promise<any[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: Partial<UserProfile>): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  createStaffUser(userId: string, displayName: string, username: string, passwordHash: string): Promise<void>;
  getUserByUsername(username: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getOrg(id: number): Promise<Org | undefined> {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, id));
    return org;
  }

  async updateOrg(id: number, updates: Partial<Org>): Promise<Org> {
    const [org] = await db.update(orgs).set(updates).where(eq(orgs.id, id)).returning();
    return org;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: Partial<Document>): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc as Document).returning();
    return newDoc;
  }

  async updateDocumentStatus(id: number, status: string): Promise<Document> {
    const [updatedDoc] = await db.update(documents).set({ status }).where(eq(documents.id, id)).returning();
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<boolean> {
    await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id));
    return true; // Soft delete
  }

  async getLatestExtraction(documentId: number): Promise<Extraction | undefined> {
    const [extraction] = await db.select().from(extractions).where(eq(extractions.documentId, documentId)).orderBy(desc(extractions.createdAt)).limit(1);
    return extraction;
  }

  async createExtraction(extraction: Partial<Extraction>): Promise<Extraction> {
    const [newExt] = await db.insert(extractions).values(extraction as Extraction).returning();
    return newExt;
  }

  async updateExtraction(id: number, updates: Partial<Extraction>): Promise<Extraction> {
    const [updatedExt] = await db.update(extractions).set(updates).where(eq(extractions.id, id)).returning();
    return updatedExt;
  }

  async getAuditEvents(): Promise<AuditEvent[]> {
    return await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt));
  }

  async createAuditEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const [newEvent] = await db.insert(auditEvents).values(event as AuditEvent).returning();
    return newEvent;
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).where(isNull(documents.deletedAt)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(and(isNull(documents.deletedAt), eq(documents.uploaderUserId, userId))).orderBy(desc(documents.createdAt));
  }

  async getDocumentsWithUploader(): Promise<any[]> {
    const results = await db
      .select({
        id: documents.id,
        orgId: documents.orgId,
        uploaderUserId: documents.uploaderUserId,
        storageKey: documents.storageKey,
        originalFilename: documents.originalFilename,
        sha256: documents.sha256,
        mimeType: documents.mimeType,
        docType: documents.docType,
        pages: documents.pages,
        status: documents.status,
        createdAt: documents.createdAt,
        deletedAt: documents.deletedAt,
        uploaderName: users.firstName,
        uploaderUsername: users.username,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploaderUserId, users.id))
      .where(isNull(documents.deletedAt))
      .orderBy(desc(documents.createdAt));
    return results;
  }

  async getSchemas(): Promise<DocumentSchema[]> {
    return await db.select().from(documentSchemas);
  }

  async getSchema(id: number): Promise<DocumentSchema | undefined> {
    const [schema] = await db.select().from(documentSchemas).where(eq(documentSchemas.id, id));
    return schema;
  }

  async createSchema(schema: Partial<DocumentSchema>): Promise<DocumentSchema> {
    const [newSchema] = await db.insert(documentSchemas).values(schema as DocumentSchema).returning();
    return newSchema;
  }

  async updateSchema(id: number, updates: Partial<DocumentSchema>): Promise<DocumentSchema> {
    const [updated] = await db.update(documentSchemas).set(updates).where(eq(documentSchemas.id, id)).returning();
    return updated;
  }

  async getUserProfiles(): Promise<any[]> {
    const results = await db
      .select({
        userId: userProfiles.userId,
        role: userProfiles.role,
        orgId: userProfiles.orgId,
        displayName: userProfiles.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        username: users.username,
      })
      .from(userProfiles)
      .leftJoin(users, eq(userProfiles.userId, users.id));
    return results;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values(profile as UserProfile).returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const [updated] = await db.update(userProfiles).set(updates).where(eq(userProfiles.userId, userId)).returning();
    return updated;
  }

  async createStaffUser(userId: string, displayName: string, username: string, passwordHash: string): Promise<void> {
    await db.insert(users).values({
      id: userId,
      username,
      passwordHash,
      firstName: displayName,
    } as any);
  }

  async getUserByUsername(username: string): Promise<any> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
}

export const storage = new DatabaseStorage();