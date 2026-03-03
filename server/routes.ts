import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Object Storage Routes
  registerObjectStorageRoutes(app);

  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.post(api.documents.upload.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.documents.upload.input.parse(req.body);
      const doc = await storage.createDocument({
        ...input,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uploaderUserId: (req as any).user.claims.sub,
      });
      
      await storage.createAuditEvent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userId: (req as any).user.claims.sub,
        eventType: "upload",
        docId: doc.id,
      });

      res.status(201).json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(doc);
  });

  app.post(api.documents.extract.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Mark document as processing
    await storage.updateDocumentStatus(doc.id, "processing");

    // In a real app, you would kick off a background job or orchestrate an agent workflow here.
    // For this MVP, we create a mock extraction.
    const extraction = await storage.createExtraction({
      documentId: doc.id,
      docType: "IC",
      extractedJson: {
        full_name: "Mock User",
        id_number: "XXXXXX-XX-XXXX",
      },
      confidence: 0.85,
      riskLevel: "LOW"
    });

    await storage.updateDocumentStatus(doc.id, "review_required");

    await storage.createAuditEvent({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userId: (req as any).user.claims.sub,
      eventType: "extract",
      docId: doc.id,
    });

    res.json(extraction);
  });

  app.get(api.documents.getExtraction.path, isAuthenticated, async (req, res) => {
    const ext = await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    res.json(ext);
  });

  app.post(api.documents.reviewApprove.path, isAuthenticated, async (req, res) => {
    const ext = await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }

    await storage.updateDocumentStatus(Number(req.params.id), "completed");
    res.json(ext);
  });

  app.post(api.documents.reviewUpdate.path, isAuthenticated, async (req, res) => {
    const ext = await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    try {
      const input = api.documents.reviewUpdate.input.parse(req.body);
      const updated = await storage.updateExtraction(ext.id, {
        extractedJson: input.extractedJson
      });
      res.json(updated);
    } catch(err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.documents.delete.path, isAuthenticated, async (req, res) => {
    const success = await storage.deleteDocument(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ message: "Not found" });
    }
    await storage.createAuditEvent({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userId: (req as any).user.claims.sub,
      eventType: "delete",
      docId: Number(req.params.id),
    });
    res.json({ success: true });
  });

  app.get(api.audit.list.path, isAuthenticated, async (req, res) => {
    const events = await storage.getAuditEvents();
    res.json(events);
  });

  app.get(api.schemas.list.path, isAuthenticated, async (req, res) => {
    const schemas = await storage.getSchemas();
    res.json(schemas);
  });

  app.post(api.schemas.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.schemas.create.input.parse(req.body);
      const schema = await storage.createSchema(input);
      res.status(201).json(schema);
    } catch(err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
