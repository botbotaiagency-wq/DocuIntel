import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { z } from "zod";
import { extractDocument } from "./extraction";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function getUserId(req: any): string {
  return req.session?.userId || req.user?.claims?.sub;
}

async function getUserRole(req: any): Promise<string> {
  const userId = getUserId(req);
  const profile = await storage.getUserProfile(userId);
  return profile?.role || "Viewer";
}

async function canAccessDocument(req: any, doc: any): Promise<boolean> {
  const role = await getUserRole(req);
  if (role === "Admin") return true;
  return doc.uploaderUserId === getUserId(req);
}

function requireAdmin(req: any, res: any, next: any) {
  getUserRole(req).then(role => {
    if (role !== "Admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    const role = profile?.role || "Viewer";

    if (role === "Admin") {
      const docs = await storage.getDocumentsWithUploader();
      res.json(docs);
    } else {
      const docs = await storage.getDocumentsByUser(userId);
      res.json(docs);
    }
  });

  app.post(api.documents.upload.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.documents.upload.input.parse(req.body);
      const userId = getUserId(req);
      const doc = await storage.createDocument({
        ...input,
        uploaderUserId: userId,
      });
      
      await storage.createAuditEvent({
        userId,
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
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
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
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
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
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
    }

    await storage.updateDocumentStatus(doc.id, "processing");

    const docType = doc.docType || "Other";

    try {
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(doc.storageKey);
      const [fileBuffer] = await file.download();
      const mimeType = doc.mimeType || "application/pdf";

      let dataUri: string;
      if (mimeType === "application/pdf") {
        const tmpDir = os.tmpdir();
        const tmpPdf = path.join(tmpDir, `extract_${doc.id}.pdf`);
        const tmpPng = path.join(tmpDir, `extract_${doc.id}`);
        fs.writeFileSync(tmpPdf, fileBuffer);
        try {
          execSync(`pdftoppm -png -f 1 -l 1 -r 200 "${tmpPdf}" "${tmpPng}"`, { timeout: 30000 });
          const pngFile = `${tmpPng}-1.png`;
          const altPngFile = `${tmpPng}-01.png`;
          const actualFile = fs.existsSync(pngFile) ? pngFile : fs.existsSync(altPngFile) ? altPngFile : null;
          if (!actualFile) throw new Error("pdftoppm produced no output");
          const pngBuffer = fs.readFileSync(actualFile);
          dataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
          fs.unlinkSync(actualFile);
        } finally {
          if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf);
        }
      } else {
        dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      }

      const annotation = await storage.getAnnotationByDocType(docType);
      let annotations: any[] | undefined;
      let templateImageUri: string | undefined;

      if (annotation) {
        annotations = annotation.annotations as any[];
        if (annotation.templateStorageKey) {
          try {
            const templateFile = await objectStorageService.getObjectEntityFile(annotation.templateStorageKey);
            const [templateBuffer] = await templateFile.download();
            templateImageUri = `data:image/png;base64,${templateBuffer.toString("base64")}`;
          } catch (e) {
            console.warn("Could not load annotation template image:", e);
          }
        }
      }

      const result = await extractDocument(dataUri, docType, mimeType, annotations, templateImageUri);

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
        userId: getUserId(req),
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
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ext = await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    res.json(ext);
  });

  app.post(api.documents.reviewApprove.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ext = await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }

    await storage.updateDocumentStatus(Number(req.params.id), "completed");
    
    await storage.createAuditEvent({
      userId: getUserId(req),
      eventType: "review_approve",
      docId: Number(req.params.id),
    });

    res.json(ext);
  });

  app.post(api.documents.reviewUpdate.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
    }
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
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!(await canAccessDocument(req, doc))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const success = await storage.deleteDocument(Number(req.params.id));
    if (!success) {
      return res.status(404).json({ message: "Not found" });
    }
    await storage.createAuditEvent({
      userId: getUserId(req),
      eventType: "delete",
      docId: Number(req.params.id),
    });
    res.json({ success: true });
  });

  app.get(api.audit.list.path, isAuthenticated, requireAdmin, async (req, res) => {
    const events = await storage.getAuditEvents();
    res.json(events);
  });

  app.get(api.schemas.list.path, isAuthenticated, async (req, res) => {
    const schemas = await storage.getSchemas();
    res.json(schemas);
  });

  app.post(api.schemas.create.path, isAuthenticated, requireAdmin, async (req, res) => {
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

  app.patch(api.schemas.update.path, isAuthenticated, requireAdmin, async (req, res) => {
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

  app.get(api.users.list.path, isAuthenticated, requireAdmin, async (req, res) => {
    const profiles = await storage.getUserProfiles();
    res.json(profiles);
  });

  app.post(api.users.create.path, isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);

      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken", field: "username" });
      }

      const userId = `staff_${Date.now()}`;
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      await storage.createStaffUser(userId, input.displayName, input.username, passwordHash);
      const profile = await storage.createUserProfile({
        userId,
        role: input.role,
        displayName: input.displayName,
      });
      res.status(201).json({ ...profile, displayName: input.displayName, username: input.username });
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

  app.patch(api.users.updateRole.path, isAuthenticated, requireAdmin, async (req, res) => {
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

  // Annotation template preview
  app.get("/api/documents/annotation-template/:docType", isAuthenticated, async (req, res) => {
    try {
      const annotation = await storage.getAnnotationByDocType(req.params.docType);
      if (!annotation || !annotation.templateStorageKey) {
        return res.status(404).json({ message: "No template found" });
      }
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(annotation.templateStorageKey);
      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", "inline");
      await objectStorageService.downloadObject(file, res, 300);
    } catch (error) {
      console.error("Error loading template:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error loading template" });
      }
    }
  });

  // Annotation routes
  app.get(api.annotations.list.path, isAuthenticated, requireAdmin, async (req, res) => {
    const annotations = await storage.getAnnotations();
    res.json(annotations);
  });

  app.get(api.annotations.getByDocType.path, isAuthenticated, requireAdmin, async (req, res) => {
    const annotation = await storage.getAnnotationByDocType(req.params.docType);
    if (!annotation) {
      return res.status(404).json({ message: "No annotation found for this document type" });
    }
    res.json(annotation);
  });

  app.post(api.annotations.create.path, isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const input = api.annotations.create.input.parse(req.body);
      const existing = await storage.getAnnotationByDocType(input.docType);
      if (existing) {
        const updated = await storage.updateAnnotation(existing.id, {
          annotations: input.annotations as any,
          templateStorageKey: input.templateStorageKey,
        });
        return res.json(updated);
      }
      const annotation = await storage.createAnnotation({
        ...input,
        annotations: input.annotations as any,
        createdBy: getUserId(req),
      });
      res.status(201).json(annotation);
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

  app.patch(api.annotations.update.path, isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const input = api.annotations.update.input.parse(req.body);
      const updated = await storage.updateAnnotation(Number(req.params.id), input as any);
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
