import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { z } from "zod";
import { extractDocument } from "./extraction";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
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
        uploaderUserId: (req as any).user.claims.sub,
      });
      
      await storage.createAuditEvent({
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
    
    try {
      const objectStorageService = new ObjectStorageService();
      const signedUrl = await objectStorageService.getSignedViewUrl(doc.storageKey);
      res.json({ ...doc, storageKey: signedUrl });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.json(doc);
    }
  });

  app.get("/api/documents/:id/preview", isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(doc.storageKey);
      if (doc.mimeType) {
        res.set("Content-Type", doc.mimeType);
      }
      res.set("Content-Disposition", "inline");
      await objectStorageService.downloadObject(file, res, 300);
    } catch (error) {
      console.error("Error streaming document:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error loading document preview" });
      }
    }
  });

  app.post(api.documents.extract.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    await storage.updateDocumentStatus(doc.id, "processing");

    const docType = doc.docType || "Other";

    try {
      const objectStorageService = new ObjectStorageService();
      const signedUrl = await objectStorageService.getSignedViewUrl(doc.storageKey);

      const result = await extractDocument(signedUrl, docType, doc.mimeType || "application/pdf");

      const extraction = await storage.createExtraction({
        documentId: doc.id,
        docType,
        extractedJson: result.extractedJson,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        validationReportJson: result.validationReport,
      });

      await storage.updateDocumentStatus(doc.id, "review_required");

      await storage.createAuditEvent({
        userId: (req as any).user.claims.sub,
        eventType: "extract",
        docId: doc.id,
      });

      res.json(extraction);
    } catch (error: any) {
      console.error("Extraction error:", error);
      await storage.updateDocumentStatus(doc.id, "failed");
      res.status(500).json({ message: "Extraction failed: " + error.message });
    }
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
    
    await storage.createAuditEvent({
      userId: (req as any).user.claims.sub,
      eventType: "review_approve",
      docId: Number(req.params.id),
    });

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

  app.patch(api.schemas.update.path, isAuthenticated, async (req, res) => {
    const schema = await storage.getSchema(Number(req.params.id));
    if (!schema) {
      return res.status(404).json({ message: "Schema not found" });
    }
    try {
      const input = api.schemas.update.input.parse(req.body);
      const updated = await storage.updateSchema(schema.id, input);
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

  app.get(api.users.list.path, isAuthenticated, async (req, res) => {
    const profiles = await storage.getUserProfiles();
    res.json(profiles);
  });

  app.post(api.users.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const userId = `staff_${Date.now()}`;
      
      await storage.createStaffUser(userId, input.displayName);
      const profile = await storage.createUserProfile({
        userId,
        role: input.role,
        displayName: input.displayName,
      });
      res.status(201).json({ ...profile, displayName: input.displayName });
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

  app.patch(api.users.updateRole.path, isAuthenticated, async (req, res) => {
    const profile = await storage.getUserProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }
    try {
      const input = api.users.updateRole.input.parse(req.body);
      const updated = await storage.updateUserProfile(profile.userId, { role: input.role });
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

  return httpServer;
}
