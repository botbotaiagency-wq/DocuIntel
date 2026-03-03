import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { documents, extractions, auditEvents, documentSchemas, orgs, userProfiles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/documents/upload' as const,
      input: z.object({
        storageKey: z.string(),
        originalFilename: z.string(),
        mimeType: z.string().optional(),
        sha256: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    extract: {
      method: 'POST' as const,
      path: '/api/documents/:id/extract' as const,
      responses: {
        200: z.custom<typeof extractions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    getExtraction: {
      method: 'GET' as const,
      path: '/api/documents/:id/extraction/latest' as const,
      responses: {
        200: z.custom<typeof extractions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reviewApprove: {
      method: 'POST' as const,
      path: '/api/documents/:id/review/approve' as const,
      responses: {
        200: z.custom<typeof extractions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reviewUpdate: {
      method: 'POST' as const,
      path: '/api/documents/:id/review/update' as const,
      input: z.object({
        extractedJson: z.any(),
      }),
      responses: {
        200: z.custom<typeof extractions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'POST' as const,
      path: '/api/documents/:id/delete' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    }
  },
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit' as const,
      responses: {
        200: z.array(z.custom<typeof auditEvents.$inferSelect>()),
      },
    },
  },
  schemas: {
    list: {
      method: 'GET' as const,
      path: '/api/schemas' as const,
      responses: {
        200: z.array(z.custom<typeof documentSchemas.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schemas' as const,
      input: z.object({
        docType: z.string(),
        jsonSchema: z.any(),
      }),
      responses: {
        201: z.custom<typeof documentSchemas.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  orgs: {
    settings: {
      method: 'PATCH' as const,
      path: '/api/org/settings' as const,
      input: z.object({
        retentionDays: z.number().optional(),
        processOnlyMode: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof orgs.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DocumentResponse = z.infer<typeof api.documents.get.responses[200]>;
export type ExtractionResponse = z.infer<typeof api.documents.getExtraction.responses[200]>;
export type AuditEventResponse = z.infer<typeof api.audit.list.responses[200]>[number];
export type SchemaResponse = z.infer<typeof api.schemas.list.responses[200]>[number];
