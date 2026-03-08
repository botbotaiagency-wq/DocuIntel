# Security: Document Extraction Export Feature

## Context (filled from codebase)

| Item | Value |
|------|--------|
| **Stack** | Node.js, Express, React, Vite, PostgreSQL, Drizzle ORM |
| **Auth** | Sessions (express-session; Passport with Replit OIDC or local username/password) |
| **Tenancy** | Multi-tenant with `org_id` on documents, user_profiles, audit_events, document_schemas |
| **Data sensitivity** | PII (identity documents, land titles, wills — names, addresses, IC numbers) |

## Feature

**Export document extraction (JSON):** `GET /api/documents/:id/export` — returns the latest extracted JSON for a document. Used for downstream integration or compliance. Contains PII; must be access-controlled, audited, and rate-limited.

---

## Top 5 data leakage / legal risks and mitigations

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Unauthorized access** — unauthenticated or wrong-tenant user receives another org’s extraction (PII). | Enforce auth on the route (`isAuthenticated`). Enforce RBAC via `canAccessDocument(req, doc)` so only the document uploader or an Admin can export. When `org_id` is consistently set, add `doc.orgId === userProfile.orgId` (or equivalent) to `canAccessDocument` for strict tenant isolation. |
| 2 | **IDOR (Insecure Direct Object Reference)** — attacker guesses document IDs and exports extractions. | All reads use the same access control as other document endpoints: resolve document by ID only after auth, then check `canAccessDocument`. No listing of IDs; document IDs are not guessable if generated sequentially and access is enforced. |
| 3 | **Abuse / exfiltration** — automated scripts export large volumes of PII. | Apply rate limiting to the export endpoint (per-IP or per-user). Use env-configured limits (e.g. `EXPORT_RATE_LIMIT_WINDOW_MS`, `EXPORT_RATE_LIMIT_MAX`); no secrets in code. |
| 4 | **Audit gap** — no record of who exported what, when (compliance/legal). | Create an audit event on every successful export (`eventType: "export"`, `docId`, `userId`, `orgId`). Do not log PII or extraction content in audit logs. |
| 5 | **Invalid input / injection** — malformed `id` causes errors or bypass. | Validate `id` server-side (e.g. Zod: integer, positive). Use validated value for DB/storage lookup only. No raw user input in queries or logs. |

---

## (1) Plan

1. **API**  
   - Add `GET /api/documents/:id/export` in shared routes and server.  
   - Response: JSON body = latest extraction’s `extractedJson` (or 404 if no extraction).  
   - No secrets in code; rate limit config from env.

2. **Auth & RBAC**  
   - Route uses `isAuthenticated` and same document resolution as `getExtraction` (by `id`).  
   - Before returning data, require `canAccessDocument(req, doc)` (uploader or Admin).  
   - Dev user: use existing dev-store path for document and extraction.

3. **Tenant isolation**  
   - Today: `canAccessDocument` uses role (Admin) or `doc.uploaderUserId === userId`.  
   - When documents and users are consistently scoped by `org_id`, extend `canAccessDocument` to require `doc.orgId == userProfile.orgId` for non-superadmin roles.

4. **Validation**  
   - Validate path param `id`: positive integer (Zod). Return 400 for invalid `id`.

5. **Rate limiting**  
   - Apply a dedicated rate limiter to this route (e.g. `express-rate-limit`).  
   - Limits read from env (e.g. `EXPORT_RATE_LIMIT_MAX`, `EXPORT_RATE_LIMIT_WINDOW_MS`).  
   - No secrets in code.

6. **Audit**  
   - On successful response, create audit event: `eventType: "export"`, `userId`, `docId`, `orgId` if available.  
   - Do not log request/response body or PII.

7. **Tests**  
   - At least one negative test: request without auth (or invalid session) → 401.  
   - Optional: authenticated user, document they cannot access → 403.

---

## (2) Code changes

- **shared/routes.ts** — Add `documents.export` path and response schema.  
- **server/routes.ts** — Register `GET /api/documents/:id/export` with:  
  - Rate limit middleware (env-based),  
  - `isAuthenticated`,  
  - Parse and validate `id`,  
  - Load document and extraction (dev vs DB),  
  - `canAccessDocument`,  
  - Audit event `export`,  
  - Return extraction JSON.  
- **server/middleware/rateLimitExport.ts** (or inline) — Rate limiter for export only.  
- **.env.example** — Document `EXPORT_RATE_LIMIT_*` (optional).  
- **Tests** — New test file: unauthenticated request to export → 401.

---

## (3) Security checklist

- [x] No secrets in code; config (including rate limits) from env.
- [x] Export endpoint protected by `isAuthenticated`.
- [x] Export endpoint enforces RBAC via `canAccessDocument` (and future org check).
- [x] All document/extraction reads use validated `id` (integer, positive).
- [x] Rate limiting applied to export endpoint; limits configurable via env.
- [x] Audit log entry on every successful export; no PII in logs.
- [x] At least one automated test for unauthorized access (401).

---

## (4) Tests

- **Unauthorized:** `GET /api/documents/1/export` with no session/cookie → **401**.  
- (Optional) **Forbidden:** Authenticated user, document owned by another user (and not Admin) → **403**.

---

## (5) Rollback plan

1. **Code rollback:**  
   - In `server/routes.ts`: remove the `exportIdSchema` and the `app.get(api.documents.export.path, ...)` block.  
   - Remove `import { rateLimitExport } from "./middleware/rateLimitExport"`.  
   - Delete `server/middleware/rateLimitExport.ts`.  
   - In `shared/routes.ts`: remove the `export` entry from `api.documents`.  
   - Optionally remove `tests/export.test.ts` and the `test` script from `package.json`.  
   - In `server/index.ts`: optionally revert the `getApp()` export and the `if (!process.env.NODE_TEST)` guard if no other tests use it.  
2. **DB:** No schema change; no migration rollback.  
3. **Audit:** Existing audit events remain; no cleanup required.  
4. **Communication:** If the endpoint was documented or integrated, notify consumers that the export endpoint is deprecated or disabled.
