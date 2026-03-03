import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
export * from "./models/auth";

export const orgs = pgTable("orgs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  retentionDays: integer("retention_days").default(7),
  processOnlyMode: boolean("process_only_mode").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  orgId: integer("org_id").references(() => orgs.id),
  role: text("role").default("Viewer").notNull(), // Admin, Reviewer, Uploader, Viewer
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => orgs.id),
  uploaderUserId: varchar("uploader_user_id").references(() => users.id),
  storageKey: text("storage_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  sha256: text("sha256"),
  mimeType: text("mime_type"),
  pages: integer("pages").default(1),
  status: text("status").notNull().default("pending"), // pending, processing, review_required, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const extractions = pgTable("extractions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  docType: text("doc_type"),
  schemaVersion: integer("schema_version"),
  extractedJson: jsonb("extracted_json"),
  confidence: doublePrecision("confidence"),
  riskLevel: text("risk_level"), // LOW, MED, HIGH
  validationReportJson: jsonb("validation_report_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => orgs.id),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").notNull(), // upload, view, extract, export, delete
  docId: integer("doc_id").references(() => documents.id),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentSchemas = pgTable("document_schemas", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => orgs.id),
  docType: text("doc_type").notNull(), // IC, Geran, Will, Other
  jsonSchema: jsonb("json_schema").notNull(),
  version: integer("version").notNull().default(1),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  org: one(orgs, { fields: [documents.orgId], references: [orgs.id] }),
  uploader: one(users, { fields: [documents.uploaderUserId], references: [users.id] }),
  extractions: many(extractions),
}));

export const extractionsRelations = relations(extractions, ({ one }) => ({
  document: one(documents, { fields: [extractions.documentId], references: [documents.id] }),
}));

export type Document = typeof documents.$inferSelect;
export type Extraction = typeof extractions.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type DocumentSchema = typeof documentSchemas.$inferSelect;
export type Org = typeof orgs.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
