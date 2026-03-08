import type { Express } from "express";
import { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { getObjectStorageService } from "./objectStorageFactory";
import { devStore, devExtractions } from "./devStore";
import { rateLimitExport } from "./middleware/rateLimitExport";
import { requireUserProfileOrg } from "./middleware/requireUserProfileOrg";
import { canAccessDocument } from "./auth/canAccessDocument";
import { z } from "zod";
import { extractDocument } from "./extraction";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export { DEV_USER_ID } from "./constants";
import { DEV_USER_ID } from "./constants";

function getUserId(req: any): string {
  return req.session?.userId || req.user?.claims?.sub;
}

function requireAdmin(req: any, res: any, next: any) {
  const profile = (req as any).userProfile;
  const isAdmin = profile?.role === "Admin";
  if (!isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app, isAuthenticated);

  app.get(api.documents.list.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    if (userId === DEV_USER_ID) {
      const docs = devStore.getDocumentsByUser(userId, orgId);
      return res.json(docs.map((d) => ({ ...d, uploaderName: "Local Dev Admin", uploaderUsername: "admin" })));
    }
    const profile = (req as any).userProfile;
    const role = profile?.role || "Viewer";

    if (role === "Admin") {
      const docs = await storage.getDocumentsWithUploader(orgId);
      res.json(docs);
    } else {
      const docs = await storage.getDocumentsByUser(userId, orgId);
      res.json(docs);
    }
  });

  app.post(api.documents.upload.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    try {
      const input = api.documents.upload.input.parse(req.body);
      const userId = getUserId(req);
      const orgId = (req as any).orgId ?? null;
      if (userId === DEV_USER_ID) {
        const doc = devStore.createDocument({
          ...input,
          uploaderUserId: userId,
          orgId: orgId ?? 1,
        });
        return res.status(201).json(doc);
      }
      const doc = await storage.createDocument({
        ...input,
        uploaderUserId: userId,
        orgId: orgId ?? undefined,
      });
      await storage.createAuditEvent({
        userId,
        orgId: orgId ?? undefined,
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

  app.get(api.documents.get.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    if (userId === DEV_USER_ID) {
      const doc = devStore.getDocument(docId, orgId);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      if (!canAccessDocument(req, doc)) return res.status(403).json({ message: "Access denied" });
      try {
        const objectStorageService = getObjectStorageService();
        const signedUrl = await objectStorageService.getSignedViewUrl(doc.storageKey);
        return res.json({ ...doc, storageKey: signedUrl });
      } catch (e) {
        return res.json(doc);
      }
    }
    const doc = await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const objectStorageService = getObjectStorageService();
      const signedUrl = await objectStorageService.getSignedViewUrl(doc.storageKey);
      res.json({ ...doc, storageKey: signedUrl });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.json(doc);
    }
  });

  app.get("/api/documents/:id/preview", isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    if (userId === DEV_USER_ID) {
      const doc = devStore.getDocument(docId, orgId);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      if (!canAccessDocument(req, doc)) return res.status(403).json({ message: "Access denied" });
      try {
        const objectStorageService = getObjectStorageService();
        const file = await objectStorageService.getObjectEntityFile(doc.storageKey);
        if (doc.mimeType) res.set("Content-Type", doc.mimeType);
        res.set("Content-Disposition", "inline");
        await objectStorageService.downloadObject(file as any, res, 300);
        return;
      } catch (e) {
        if (!res.headersSent) res.status(500).json({ message: "Error loading document preview" });
        return;
      }
    }
    const doc = await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const objectStorageService = getObjectStorageService();
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

  app.post(api.documents.extract.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    const doc = userId === DEV_USER_ID
      ? devStore.getDocument(docId, orgId)
      : await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (userId === DEV_USER_ID) {
      devStore.updateDocumentStatus(doc.id, "processing");
    } else {
      await storage.updateDocumentStatus(doc.id, "processing", orgId);
    }

    const docType = doc.docType || "Other";

    try {
      const objectStorageService = getObjectStorageService();
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

      const annotation = userId === DEV_USER_ID
        ? devStore.getAnnotationByDocType(docType)
        : await storage.getAnnotationByDocType(docType);
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

      let extraction: { id: number; documentId: number; docType: string; extractedJson: any; confidence: number; riskLevel: string; validationReportJson: any };
      if (userId === DEV_USER_ID) {
        extraction = devExtractions.create({
          documentId: doc.id,
          docType,
          extractedJson: result.extractedJson,
          confidence: result.confidence,
          riskLevel: result.riskLevel,
          validationReportJson: result.validationReport,
        }) as any;
        devStore.updateDocumentStatus(doc.id, "review_required");
      } else {
        extraction = await storage.createExtraction({
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
          orgId: orgId ?? undefined,
          eventType: "extract",
          docId: doc.id,
        });
      }

      res.json(extraction);
    } catch (error: any) {
      console.error("Extraction error:", error);
      const doc = getUserId(req) === DEV_USER_ID ? devStore.getDocument(Number(req.params.id), orgId) : await storage.getDocument(Number(req.params.id), orgId);
      if (doc) {
        if (getUserId(req) === DEV_USER_ID) devStore.updateDocumentStatus(doc.id, "failed");
        else await storage.updateDocumentStatus(doc.id, "failed", orgId);
      }
      res.status(500).json({ message: "Extraction failed: " + error.message });
    }
  });

  app.get(api.documents.getExtraction.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    const doc = userId === DEV_USER_ID
      ? devStore.getDocument(docId, orgId)
      : await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ext = userId === DEV_USER_ID
      ? devExtractions.getLatest(Number(req.params.id))
      : await storage.getLatestExtraction(Number(req.params.id));
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    res.json(ext);
  });

  const exportIdSchema = z.object({ id: z.coerce.number().int().positive() });

  app.get(
    api.documents.export.path,
    isAuthenticated,
    requireUserProfileOrg,
    rateLimitExport,
    async (req, res) => {
      const parsed = exportIdSchema.safeParse({ id: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid document id" });
      }
      const docId = parsed.data.id;
      const userId = getUserId(req);
      const orgId = (req as any).orgId ?? null;
      const doc = userId === DEV_USER_ID
        ? devStore.getDocument(docId, orgId)
        : await storage.getDocument(docId, orgId);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (!canAccessDocument(req, doc)) {
        return res.status(403).json({ message: "Access denied" });
      }
      const ext = userId === DEV_USER_ID
        ? devExtractions.getLatest(docId)
        : await storage.getLatestExtraction(docId);
      if (!ext || !ext.extractedJson) {
        return res.status(404).json({ message: "No extraction found for this document" });
      }
      if (userId !== DEV_USER_ID) {
        await storage.createAuditEvent({
          userId,
          eventType: "export",
          docId,
          orgId: orgId ?? undefined,
        });
      }
      res.json(ext.extractedJson as Record<string, unknown>);
    }
  );

  app.post(api.documents.reviewApprove.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    const doc = userId === DEV_USER_ID ? devStore.getDocument(docId, orgId) : await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ext = userId === DEV_USER_ID ? devExtractions.getLatest(docId) : await storage.getLatestExtraction(docId);
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    if (userId === DEV_USER_ID) {
      devStore.updateDocumentStatus(doc.id, "completed");
    } else {
      await storage.updateDocumentStatus(docId, "completed", orgId);
      await storage.createAuditEvent({ userId, orgId: orgId ?? undefined, eventType: "review_approve", docId });
    }
    res.json(ext);
  });

  app.post(api.documents.reviewUpdate.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const userId = getUserId(req);
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    const doc = userId === DEV_USER_ID ? devStore.getDocument(docId, orgId) : await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ext = userId === DEV_USER_ID ? devExtractions.getLatest(docId) : await storage.getLatestExtraction(docId);
    if (!ext) {
      return res.status(404).json({ message: "Extraction not found" });
    }
    try {
      const input = api.documents.reviewUpdate.input.parse(req.body);
      const updated = userId === DEV_USER_ID
        ? devExtractions.update(ext.id, { extractedJson: input.extractedJson })
        : await storage.updateExtraction(ext.id, { extractedJson: input.extractedJson });
      if (!updated) return res.status(404).json({ message: "Extraction not found" });
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

  app.post(api.documents.delete.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    const orgId = (req as any).orgId ?? null;
    const docId = Number(req.params.id);
    const doc = await storage.getDocument(docId, orgId);
    if (!doc) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!canAccessDocument(req, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    await storage.deleteDocument(docId, orgId);
    await storage.createAuditEvent({
      userId: getUserId(req),
      orgId: orgId ?? undefined,
      eventType: "delete",
      docId,
    });
    res.json({ success: true });
  });

  app.get(api.audit.list.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    if (getUserId(req) === DEV_USER_ID) return res.json([]);
    const orgId = (req as any).orgId ?? null;
    const events = await storage.getAuditEvents(orgId);
    res.json(events);
  });

  app.get(api.schemas.list.path, isAuthenticated, requireUserProfileOrg, async (req, res) => {
    if (getUserId(req) === DEV_USER_ID) return res.json([]);
    const orgId = (req as any).orgId ?? null;
    const schemas = await storage.getSchemas(orgId);
    res.json(schemas);
  });

  app.post(api.schemas.create.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    try {
      const input = api.schemas.create.input.parse(req.body);
      const orgId = (req as any).orgId ?? null;
      const schema = await storage.createSchema({ ...input, orgId: orgId ?? undefined });
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

  app.patch(api.schemas.update.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    const orgId = (req as any).orgId ?? null;
    const schemaId = Number(req.params.id);
    const schema = await storage.getSchema(schemaId, orgId);
    if (!schema) {
      return res.status(404).json({ message: "Schema not found" });
    }
    try {
      const input = api.schemas.update.input.parse(req.body);
      const updated = await storage.updateSchema(schema.id, input, orgId);
      if (!updated) return res.status(404).json({ message: "Schema not found" });
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

  app.get(api.users.list.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    if (getUserId(req) === DEV_USER_ID) return res.json([]);
    const orgId = (req as any).orgId ?? null;
    const profiles = await storage.getUserProfiles(orgId);
    res.json(profiles);
  });

  app.post(api.users.create.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const orgId = (req as any).orgId ?? null;

      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken", field: "username" });
      }

      const userId = `staff_${Date.now()}`;
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      await storage.createStaffUser(userId, input.displayName, input.username, passwordHash);
      const profile = await storage.createUserProfile({
        userId,
        orgId: orgId ?? undefined,
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

  app.patch(api.users.updateRole.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    const orgId = (req as any).orgId ?? null;
    const profile = await storage.getUserProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }
    if (orgId != null && profile.orgId !== orgId) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const input = api.users.updateRole.input.parse(req.body);
      const updated = await storage.updateUserProfile(profile.userId, { role: input.role }, orgId);
      if (!updated) return res.status(404).json({ message: "User not found" });
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

  // Annotation template preview (used when editing saved annotations)
  app.get("/api/documents/annotation-template/:docType", isAuthenticated, requireUserProfileOrg, async (req, res) => {
    try {
      const userId = getUserId(req);
      const annotation = userId === DEV_USER_ID
        ? devStore.getAnnotationByDocType(req.params.docType)
        : await storage.getAnnotationByDocType(req.params.docType);
      if (!annotation || !annotation.templateStorageKey) {
        return res.status(404).json({ message: "No template found" });
      }
      const objectStorageService = getObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(annotation.templateStorageKey);
      res.set("Content-Type", "image/png");
      res.set("Content-Disposition", "inline");
      await objectStorageService.downloadObject(file as any, res, 300);
    } catch (error) {
      console.error("Error loading template:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error loading template" });
      }
    }
  });

  // Annotation routes (saved in dev store for Local Dev Admin; used by extraction)
  app.get(api.annotations.list.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    if (getUserId(req) === DEV_USER_ID) {
      return res.json(devStore.getAnnotations());
    }
    const annotations = await storage.getAnnotations();
    res.json(annotations);
  });

  app.get(api.annotations.getByDocType.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    const docType = req.params.docType;
    if (getUserId(req) === DEV_USER_ID) {
      const annotation = devStore.getAnnotationByDocType(docType);
      if (!annotation) return res.status(404).json({ message: "No annotation found for this document type" });
      return res.json(annotation);
    }
    const annotation = await storage.getAnnotationByDocType(docType);
    if (!annotation) {
      return res.status(404).json({ message: "No annotation found for this document type" });
    }
    res.json(annotation);
  });

  app.post(api.annotations.create.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    try {
      const input = api.annotations.create.input.parse(req.body);
      const userId = getUserId(req);
      if (userId === DEV_USER_ID) {
        const annotation = devStore.saveAnnotation({
          docType: input.docType,
          templateStorageKey: input.templateStorageKey ?? undefined,
          annotations: input.annotations as any,
          createdBy: userId,
        });
        return res.status(201).json(annotation);
      }
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
        createdBy: userId,
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

  app.patch(api.annotations.update.path, isAuthenticated, requireUserProfileOrg, requireAdmin, async (req, res) => {
    try {
      const input = api.annotations.update.input.parse(req.body);
      const userId = getUserId(req);
      if (userId === DEV_USER_ID) {
        const updated = devStore.updateAnnotation(Number(req.params.id), {
          annotations: input.annotations as any,
          templateStorageKey: input.templateStorageKey,
        });
        if (!updated) return res.status(404).json({ message: "Annotation not found" });
        return res.json(updated);
      }
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
