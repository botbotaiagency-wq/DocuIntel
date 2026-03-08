/**
 * Central guard: tenant-first, then RBAC.
 * Deny if doc or user missing orgId; deny if different org; allow if same-org admin or owner.
 */
import type { Request } from "express";
import type { RequestWithOrg } from "../middleware/requireUserProfileOrg";

export function canAccessDocument(req: Request, doc: any): boolean {
  const profile = (req as RequestWithOrg).userProfile;
  if (!profile) return false;

  const userOrgId = profile.orgId ?? (profile as any).org_id;
  const docOrgId = doc?.orgId ?? doc?.org_id;

  // Missing org → deny (legacy/unsafe)
  if (userOrgId == null || docOrgId == null) return false;
  if (docOrgId !== userOrgId) return false;

  const isAdmin = profile.role === "Admin" || (profile as any).isAdmin === true;
  const uploaderId = doc?.uploaderUserId ?? doc?.uploader_user_id;
  const isOwner = uploaderId === profile.userId;

  return isAdmin || isOwner;
}
