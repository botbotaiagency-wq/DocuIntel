import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const LOCAL_STORAGE_DIR =
  process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "local-storage");
const UPLOADS_DIR = path.join(LOCAL_STORAGE_DIR, "uploads");

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/** Local file adapter matching the interface used by routes (GCS File-like). */
export interface ILocalFile {
  name: string;
  getMetadata(): Promise<[{ contentType?: string; size?: number }]>;
  createReadStream(): Readable;
  download(): Promise<[Buffer]>;
}

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Local filesystem-backed object storage for development without Replit/GCS.
 * Use when USE_LOCAL_STORAGE=1.
 */
export class LocalObjectStorageService {
  constructor() {}

  /** Upload URL is our own endpoint; client will PUT to it. */
  async getObjectEntityUploadURL(): Promise<string> {
    ensureUploadsDir();
    const objectId = randomUUID();
    const port = process.env.PORT || "5000";
    const base = process.env.LOCAL_APP_URL || `http://localhost:${port}`;
    return `${base}/api/local-upload/${objectId}`;
  }

  /** objectPath is /objects/uploads/:id; resolve to local file path. */
  async getObjectEntityFile(objectPath: string): Promise<ILocalFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    const localPath = path.join(LOCAL_STORAGE_DIR, entityId);
    if (!fs.existsSync(localPath) || !fs.statSync(localPath).isFile()) {
      throw new ObjectNotFoundError();
    }
    return createLocalFile(localPath, objectPath);
  }

  /** For local uploads we store path as /objects/uploads/:id; normalize same. */
  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }
    const match = rawPath.match(/\/api\/local-upload\/([a-f0-9-]+)/i);
    if (match) {
      return `/objects/uploads/${match[1]}`;
    }
    return rawPath;
  }

  /** Return a URL that serves the file via our GET route. */
  async getSignedViewUrl(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.split("/");
    const id = parts[parts.length - 1];
    const port = process.env.PORT || "5000";
    const base = process.env.LOCAL_APP_URL || `http://localhost:${port}`;
    return `${base}/api/local-object/uploads/${id}`;
  }

  /** Stream local file to response. */
  async downloadObject(
    file: ILocalFile,
    res: Response,
    _cacheTtlSec: number = 3600
  ): Promise<void> {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": String(metadata.size ?? 0),
        "Cache-Control": "private, max-age=3600",
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}

function createLocalFile(localPath: string, objectPath: string): ILocalFile {
  return {
    name: objectPath,
    async getMetadata(): Promise<[{ contentType?: string; size?: number }]> {
      const stat = fs.statSync(localPath);
      return [
        {
          contentType: "application/octet-stream",
          size: stat.size,
        },
      ];
    },
    createReadStream(): Readable {
      return fs.createReadStream(localPath);
    },
    async download(): Promise<[Buffer]> {
      const buf = fs.readFileSync(localPath);
      return [buf];
    },
  };
}

/** Path on disk for a given object path (e.g. /objects/uploads/uuid -> .../uploads/uuid). */
export function getLocalPath(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new ObjectNotFoundError();
  }
  const entityId = objectPath.replace(/^\/objects\//, "");
  return path.join(LOCAL_STORAGE_DIR, entityId);
}

/** Save uploaded body to local file (used by PUT /api/local-upload/:id). */
export function saveLocalUpload(id: string, body: Buffer): string {
  ensureUploadsDir();
  const localPath = path.join(UPLOADS_DIR, id);
  fs.writeFileSync(localPath, body);
  return `/objects/uploads/${id}`;
}
