import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import {
  LocalObjectStorageService,
  ObjectNotFoundError,
} from "./localStorage";

export { ObjectNotFoundError };

export type AnyObjectStorageService =
  | ObjectStorageService
  | LocalObjectStorageService;

export function getObjectStorageService(): AnyObjectStorageService {
  if (process.env.USE_LOCAL_STORAGE === "1") {
    return new LocalObjectStorageService();
  }
  return new ObjectStorageService();
}
