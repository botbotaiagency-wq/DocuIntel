/**
 * Ensures every protected request has a loaded userProfile with orgId (tenant context).
 * Apply after isAuthenticated. Sets req.userProfile and req.orgId.
 * In test (NODE_TEST=1), allows X-Test-User-Profile header to inject profile for deterministic 403 tests.
 */
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { DEV_USER_ID } from "../constants";

export interface RequestWithOrg extends Request {
  userProfile?: { userId: string; orgId: number | null; role: string };
  orgId?: number;
}

const DEFAULT_DEV_ORG_ID = 1;

export async function requireUserProfileOrg(
  req: RequestWithOrg,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as any).session?.userId ?? (req as any).user?.claims?.sub;
  if (!userId) {
    res.status(403).json({ message: "Tenant context missing" });
    return;
  }

  // Test stub: allow injecting profile via header when NODE_TEST=1 (no PII in header)
  if (process.env.NODE_TEST === "1") {
    const raw = req.get("X-Test-User-Profile");
    if (raw) {
      try {
        const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
        req.userProfile = {
          userId: decoded.userId ?? userId,
          orgId: decoded.orgId ?? null,
          role: decoded.role ?? "Viewer",
        };
        if (decoded.orgId != null) {
          req.orgId = decoded.orgId;
        }
        if (req.userProfile.orgId == null) {
          res.status(403).json({ message: "Tenant context missing" });
          return;
        }
        next();
        return;
      } catch {
        // fall through to normal load
      }
    }
  }

  // Dev user: assign default org so local/dev works without DB org setup
  if (userId === DEV_USER_ID) {
    req.userProfile = { userId: DEV_USER_ID, orgId: DEFAULT_DEV_ORG_ID, role: "Admin" };
    req.orgId = DEFAULT_DEV_ORG_ID;
    next();
    return;
  }

  const profile = await storage.getUserProfile(userId);
  if (!profile) {
    res.status(403).json({ message: "Tenant context missing" });
    return;
  }

  const orgId = profile.orgId ?? (profile as any).org_id ?? null;
  if (orgId == null) {
    res.status(403).json({ message: "Tenant context missing" });
    return;
  }

  req.userProfile = {
    userId,
    orgId,
    role: profile.role ?? "Viewer",
  };
  req.orgId = orgId;
  next();
}
