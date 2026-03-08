import { type Document, type Extraction, type AuditEvent, type DocumentSchema, type Org, type UserProfile, type DocumentAnnotation } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { documents, extractions, auditEvents, documentSchemas, orgs, userProfiles, users, documentAnnotations } from "@shared/schema";

export interface IStorage {
  // Orgs
  getOrg(id: number): Promise<Org | undefined>;
  updateOrg(id: number, updates: Partial<Org>): Promise<Org>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocumentsByUser(userId: string, orgId?: number | null): Promise<Document[]>;
  getDocumentsWithUploader(orgId?: number | null): Promise<any[]>;
  getDocument(id: number, orgId?: number | null): Promise<Document | undefined>;
  createDocument(doc: Partial<Document>): Promise<Document>;
  updateDocumentStatus(id: number, status: string, orgId?: number | null): Promise<Document | undefined>;
  deleteDocument(id: number, orgId?: number | null): Promise<boolean>;

  // Extractions
  getLatestExtraction(documentId: number): Promise<Extraction | undefined>;
  createExtraction(extraction: Partial<Extraction>): Promise<Extraction>;
  updateExtraction(id: number, updates: Partial<Extraction>): Promise<Extraction>;

  // Audit
  getAuditEvents(orgId?: number | null): Promise<AuditEvent[]>;
  createAuditEvent(event: Partial<AuditEvent>): Promise<AuditEvent>;

  // Schemas
  getSchemas(orgId?: number | null): Promise<DocumentSchema[]>;
  getSchema(id: number, orgId?: number | null): Promise<DocumentSchema | undefined>;
  createSchema(schema: Partial<DocumentSchema>): Promise<DocumentSchema>;
  updateSchema(id: number, updates: Partial<DocumentSchema>, orgId?: number | null): Promise<DocumentSchema | undefined>;

  // User Profiles
  getUserProfiles(orgId?: number | null): Promise<any[]>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: Partial<UserProfile>): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>, orgId?: number | null): Promise<UserProfile | undefined>;
  createStaffUser(userId: string, displayName: string, username: string, passwordHash: string): Promise<void>;
  getUserByUsername(username: string): Promise<any>;

  // Annotations
  getAnnotationByDocType(docType: string): Promise<DocumentAnnotation | undefined>;
  getAnnotations(): Promise<DocumentAnnotation[]>;
  createAnnotation(annotation: Partial<DocumentAnnotation>): Promise<DocumentAnnotation>;
  updateAnnotation(id: number, updates: Partial<DocumentAnnotation>): Promise<DocumentAnnotation>;
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

  async getDocument(id: number, orgId?: number | null): Promise<Document | undefined> {
    if (orgId != null) {
      const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.orgId, orgId)));
      return doc;
    }
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: Partial<Document>): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc as Document).returning();
    return newDoc;
  }

  async updateDocumentStatus(id: number, status: string, orgId?: number | null): Promise<Document | undefined> {
    if (orgId != null) {
      const [updatedDoc] = await db.update(documents).set({ status }).where(and(eq(documents.id, id), eq(documents.orgId, orgId))).returning();
      return updatedDoc;
    }
    const [updatedDoc] = await db.update(documents).set({ status }).where(eq(documents.id, id)).returning();
    return updatedDoc;
  }

  async deleteDocument(id: number, orgId?: number | null): Promise<boolean> {
    if (orgId != null) {
      await db.update(documents).set({ deletedAt: new Date() }).where(and(eq(documents.id, id), eq(documents.orgId, orgId)));
    } else {
      await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id));
    }
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

  async getAuditEvents(orgId?: number | null): Promise<AuditEvent[]> {
    if (orgId != null) {
      return await db.select().from(auditEvents).where(eq(auditEvents.orgId, orgId)).orderBy(desc(auditEvents.createdAt));
    }
    return await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt));
  }

  async createAuditEvent(event: Partial<AuditEvent>): Promise<AuditEvent> {
    const [newEvent] = await db.insert(auditEvents).values(event as AuditEvent).returning();
    return newEvent;
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).where(isNull(documents.deletedAt)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByUser(userId: string, orgId?: number | null): Promise<Document[]> {
    const conditions = [isNull(documents.deletedAt), eq(documents.uploaderUserId, userId)];
    if (orgId != null) conditions.push(eq(documents.orgId, orgId));
    return await db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsWithUploader(orgId?: number | null): Promise<any[]> {
    const conditions = [isNull(documents.deletedAt)];
    if (orgId != null) conditions.push(eq(documents.orgId, orgId));
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
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));
    return results;
  }

  async getSchemas(orgId?: number | null): Promise<DocumentSchema[]> {
    if (orgId != null) {
      return await db.select().from(documentSchemas).where(eq(documentSchemas.orgId, orgId));
    }
    return await db.select().from(documentSchemas);
  }

  async getSchema(id: number, orgId?: number | null): Promise<DocumentSchema | undefined> {
    if (orgId != null) {
      const [schema] = await db.select().from(documentSchemas).where(and(eq(documentSchemas.id, id), eq(documentSchemas.orgId, orgId)));
      return schema;
    }
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

  async getUserProfiles(orgId?: number | null): Promise<any[]> {
    if (orgId != null) {
      return await db
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
        .leftJoin(users, eq(userProfiles.userId, users.id))
        .where(eq(userProfiles.orgId, orgId));
    }
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

  async updateUserProfile(userId: string, updates: Partial<UserProfile>, orgId?: number | null): Promise<UserProfile | undefined> {
    if (orgId != null) {
      const [updated] = await db.update(userProfiles).set(updates).where(and(eq(userProfiles.userId, userId), eq(userProfiles.orgId, orgId))).returning();
      return updated;
    }
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

  async getAnnotationByDocType(docType: string): Promise<DocumentAnnotation | undefined> {
    const [annotation] = await db.select().from(documentAnnotations).where(eq(documentAnnotations.docType, docType));
    return annotation;
  }

  async getAnnotations(): Promise<DocumentAnnotation[]> {
    return await db.select().from(documentAnnotations).orderBy(desc(documentAnnotations.createdAt));
  }

  async createAnnotation(annotation: Partial<DocumentAnnotation>): Promise<DocumentAnnotation> {
    const [newAnnotation] = await db.insert(documentAnnotations).values(annotation as DocumentAnnotation).returning();
    return newAnnotation;
  }

  async updateAnnotation(id: number, updates: Partial<DocumentAnnotation>): Promise<DocumentAnnotation> {
    const [updated] = await db.update(documentAnnotations).set({ ...updates, updatedAt: new Date() }).where(eq(documentAnnotations.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();