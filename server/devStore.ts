/**
 * In-memory store for Local Dev Admin (no PostgreSQL).
 * Allows full app testing: uploads, annotations, and extraction using saved annotations.
 * Data is lost on server restart.
 */

let nextDocId = 1;
let nextAnnotationId = 1;

export interface DevDocument {
  id: number;
  orgId: number | null;
  storageKey: string;
  originalFilename: string;
  mimeType?: string;
  docType?: string;
  status: string;
  uploaderUserId: string;
  createdAt: Date;
  deletedAt?: Date | null;
}

export interface DevAnnotation {
  id: number;
  docType: string;
  templateStorageKey: string | null;
  annotations: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const documents: DevDocument[] = [];
const annotationsByDocType = new Map<string, DevAnnotation>();

const DEFAULT_DEV_ORG_ID = 1;

export const devStore = {
  createDocument(doc: {
    storageKey: string;
    originalFilename: string;
    mimeType?: string;
    docType?: string;
    uploaderUserId: string;
    orgId?: number | null;
  }): DevDocument {
    const id = nextDocId++;
    const row: DevDocument = {
      id,
      orgId: doc.orgId ?? DEFAULT_DEV_ORG_ID,
      storageKey: doc.storageKey,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      docType: doc.docType,
      status: "pending",
      uploaderUserId: doc.uploaderUserId,
      createdAt: new Date(),
      deletedAt: null,
    };
    documents.push(row);
    return row;
  },

  getDocument(id: number, orgId?: number | null): DevDocument | undefined {
    const doc = documents.find((d) => d.id === id && !d.deletedAt);
    if (!doc) return undefined;
    if (orgId != null && doc.orgId !== orgId) return undefined;
    return doc;
  },

  getDocumentsByUser(userId: string, orgId?: number | null): DevDocument[] {
    return documents
      .filter((d) => !d.deletedAt && d.uploaderUserId === userId && (orgId == null || d.orgId === orgId))
      .reverse();
  },

  updateDocumentStatus(id: number, status: string): void {
    const doc = documents.find((d) => d.id === id);
    if (doc) doc.status = status;
  },

  getAnnotationByDocType(docType: string): DevAnnotation | undefined {
    return annotationsByDocType.get(docType);
  },

  getAnnotations(): DevAnnotation[] {
    return Array.from(annotationsByDocType.values());
  },

  saveAnnotation(data: {
    docType: string;
    templateStorageKey?: string;
    annotations: Array<{ x: number; y: number; width: number; height: number; label: string }>;
    createdBy: string;
  }): DevAnnotation {
    const existing = annotationsByDocType.get(data.docType);
    const now = new Date();
    const row: DevAnnotation = {
      id: existing?.id ?? nextAnnotationId++,
      docType: data.docType,
      templateStorageKey: data.templateStorageKey ?? existing?.templateStorageKey ?? null,
      annotations: data.annotations,
      createdBy: data.createdBy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    annotationsByDocType.set(data.docType, row);
    return row;
  },

  updateAnnotation(id: number, data: Partial<Pick<DevAnnotation, "annotations" | "templateStorageKey">>): DevAnnotation | undefined {
    const entry = Array.from(annotationsByDocType.entries()).find(([, a]) => a.id === id);
    if (!entry) return undefined;
    const [docType, ann] = entry;
    const updated: DevAnnotation = {
      ...ann,
      ...data,
      updatedAt: new Date(),
    };
    annotationsByDocType.set(docType, updated);
    return updated;
  },
};

let nextExtractionId = 1;
const extractions: Array<{
  id: number;
  documentId: number;
  docType: string;
  extractedJson: Record<string, unknown>;
  confidence: number;
  riskLevel: string;
  validationReportJson: Record<string, unknown>;
  createdAt: Date;
}> = [];

export const devExtractions = {
  create(data: {
    documentId: number;
    docType: string;
    extractedJson: Record<string, unknown>;
    confidence: number;
    riskLevel: string;
    validationReportJson: Record<string, unknown>;
  }) {
    const id = nextExtractionId++;
    const row = { id, ...data, createdAt: new Date() };
    extractions.push(row);
    return { ...row };
  },
  getLatest(documentId: number) {
    return extractions.filter((e) => e.documentId === documentId).sort((a, b) => b.id - a.id)[0];
  },
  update(id: number, data: { extractedJson?: Record<string, unknown> }) {
    const row = extractions.find((e) => e.id === id);
    if (!row) return undefined;
    if (data.extractedJson != null) row.extractedJson = data.extractedJson;
    return { ...row };
  },
};
