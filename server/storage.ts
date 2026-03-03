import { type Document, type Extraction, type AuditEvent, type DocumentSchema, type Org } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { documents, extractions, auditEvents, documentSchemas, orgs } from "@shared/schema";

export interface IStorage {
  // Orgs
  getOrg(id: number): Promise<Org | undefined>;
  updateOrg(id: number, updates: Partial<Org>): Promise<Org>;

  // Documents
  getDocuments(): Promise<Document[]>;
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
  createSchema(schema: Partial<DocumentSchema>): Promise<DocumentSchema>;
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

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
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

  async getSchemas(): Promise<DocumentSchema[]> {
    return await db.select().from(documentSchemas);
  }

  async createSchema(schema: Partial<DocumentSchema>): Promise<DocumentSchema> {
    const [newSchema] = await db.insert(documentSchemas).values(schema as DocumentSchema).returning();
    return newSchema;
  }
}

export const storage = new DatabaseStorage();