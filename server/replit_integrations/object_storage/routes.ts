import type { Express } from "express";
import { getObjectStorageService } from "../../objectStorageFactory";
import { saveLocalUpload } from "../../localStorage";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * When USE_LOCAL_STORAGE=1, uploads go to the local filesystem.
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = getObjectStorageService();

  // Local storage: handle PUT /api/local-upload/:id (client uploads file here)
  if (process.env.USE_LOCAL_STORAGE === "1") {
    app.put("/api/local-upload/:id", expressRawBody(), (req: any, res) => {
      const id = req.params.id;
      if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
        return res.status(400).json({ error: "Invalid upload id" });
      }
      const body = req.rawBody ?? (req.body && Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? ""));
      if (!body || body.length === 0) {
        return res.status(400).json({ error: "No file data" });
      }
      try {
        saveLocalUpload(id, Buffer.isBuffer(body) ? body : Buffer.from(body));
        res.status(200).json({ ok: true });
      } catch (e) {
        console.error("Local upload save error:", e);
        res.status(500).json({ error: "Failed to save file" });
      }
    });

    app.get("/api/local-object/uploads/:id", async (req, res) => {
      try {
        const file = await objectStorageService.getObjectEntityFile(`/objects/uploads/${req.params.id}`);
        await objectStorageService.downloadObject(file as any, res);
      } catch (error: any) {
        if (error?.name === "ObjectNotFoundError") {
          return res.status(404).json({ error: "Object not found" });
        }
        res.status(500).json({ error: "Failed to serve object" });
      }
    });
  }

  function expressRawBody() {
    return (req: any, _res: any, next: () => void) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        req.rawBody = Buffer.concat(chunks);
        next();
      });
    };
  }

  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.use("/objects", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile("/objects" + req.path);
      await objectStorageService.downloadObject(objectFile as any, res);
    } catch (error: any) {
      console.error("Error serving object:", error);
      if (error?.name === "ObjectNotFoundError") {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

