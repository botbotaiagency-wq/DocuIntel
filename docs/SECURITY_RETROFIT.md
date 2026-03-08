# Security Retrofit — Live System

**Goal:** Make the existing launched product production-safe with minimal downtime.

---

## 1) Risk Register

| ID | Risk | Severity | Fix |
|----|------|----------|-----|
| R1 | **Object storage routes unauthenticated** — `PUT /api/local-upload/:id`, `GET /api/local-object/uploads/:id`, `POST /api/uploads/request-url`, `GET /objects/*` have no auth. Anyone can upload/read files by UUID. | **Critical** | Add `isAuthenticated` (and optionally one-time token/signed URL) to all object storage routes. For local-upload, require session and validate upload id was issued to this user (e.g. short-lived token in request-url response). |
| R2 | **Tenant isolation not enforced** — `canAccessDocument` uses only Admin or uploader; no `org_id` check. `getAuditEvents()`, `getSchemas()`, `getUserProfiles()` return all orgs. Documents created without `orgId`. | **High** | Add `orgId` to request context from `userProfile.orgId`. In `canAccessDocument` require `doc.orgId === requestOrgId` (or uploader) for non-superadmin. Add `orgId` filter to all list queries (audit, schemas, users). Set `orgId` on document create from current user's org. |
| R3 | **IDOR on user/schema by id** — `PATCH /api/users/:userId` and `PATCH /api/schemas/:id` allow Admin to modify any user/schema; no check that target belongs to Admin's org. | **High** | For user update: ensure `profile.orgId === requestOrgId` (or superadmin). For schema update: ensure `schema.orgId === requestOrgId`. Return 403 if cross-tenant. |
| R4 | **CORS not configured** — No CORS middleware; browser requests from any origin accepted. | **High** | Add `cors({ origin: allowedOrigins, credentials: true })` with env-configured allowlist (e.g. `CORS_ORIGINS`). |
| R5 | **No global rate limiting** — Only export endpoint is rate-limited. Auth and API are open to brute-force / DoS. | **Medium** | Add global rate limit (e.g. per-IP) and stricter limit on auth endpoints (login, request-url). |
| R6 | **Path params not validated** — Many routes use `Number(req.params.id)` without validation; invalid id can throw or behave oddly. | **Medium** | Use Zod (or shared schema) to validate all `:id`/`:userId`/`:docType` params; return 400 for invalid. |
| R7 | **Secrets in code** — Default session secret in dev; no verification that production uses strong secret. | **Medium** | Ensure no default in production (fail startup if `NODE_ENV=production` and `SESSION_SECRET` weak/missing). Use env/secret manager only. |
| R8 | **HTTPS not enforced** — No in-app redirect HTTP→HTTPS; cookie `secure` only in production. | **Low** | Rely on reverse proxy (Cloudflare/WAF) for HTTPS and HSTS; document that app must run behind TLS termination. |
| R9 | **Audit/schemas/users lists cross-tenant** — Admin sees all orgs’ data. | **High** | Same as R2: filter by `requestOrgId` in storage layer or route. |
| R10 | **CSRF on state-changing operations** — Session cookies; no CSRF tokens on POST/PATCH/DELETE. | **Medium** | Use SameSite=Strict (or Lax) cookie; consider double-submit cookie or Origin check for non-GET. |

---

## 2) Security Checklist Status

| Phase | Control | Status | Notes |
|-------|---------|--------|--------|
| **0** | Rotate exposed credentials | **Manual** | Rotate all keys/secrets that may have been exposed; use env/secret manager only. |
| **0** | Secrets only in env/secret manager | **Pass** | No hardcoded secrets in repo; `.env` gitignored. |
| **0** | Basic rate limiting + WAF | **Fail** | Only export has rate limit; no WAF (deploy Cloudflare or equivalent). |
| **0** | CORS locked to known frontends | **Fail** | No CORS middleware. |
| **0** | HTTPS only; disable insecure endpoints | **Partial** | Cookie `secure` in production; HTTPS enforced at proxy (document). |
| **1** | IDOR: every id endpoint verifies ownership/tenant | **Fail** | Document endpoints use `canAccessDocument` but no org; user/schema update has no org check; object storage has no auth. |
| **1** | Tenant isolation: org_id in queries | **Fail** | Tables have `org_id`; app does not set or filter by it. |
| **1** | RLS on sensitive tables | **N/A** | Using Drizzle/Node; RLS possible in Postgres as defense-in-depth (Phase 1 enhancement). |
| **2** | RBAC (owner/admin/member/viewer) | **Partial** | Admin vs non-Admin; no org-scoped Admin. |
| **2** | Centralized permission checks | **Partial** | `canAccessDocument` and `requireAdmin` exist but not org-aware. |
| **2** | Audit logs for admin actions | **Partial** | Audit for upload, extract, export, delete; not for user/schema/annotation changes. |
| **3** | Server-side validation at all API boundaries | **Partial** | Zod on body where defined; path params often unchecked. |
| **3** | CSRF protections | **Fail** | No CSRF tokens; SameSite not explicitly set. |
| **4** | Error monitoring + security logging | **Fail** | No Sentry; no structured security events (auth failures, permission denied). |
| **5** | Data inventory + Privacy/ToS + DPA + IR plan | **Manual** | Docs exist (PRIVACY.md); formal inventory and IR plan to be completed. |

---

## 3) Patch Plan (ordered for lowest downtime)

Execute in order; each step is independently deployable.

| Order | Action | Downtime | Owner |
|-------|--------|----------|--------|
| **0.1** | Rotate credentials (DB, session secret, API keys). Store in secret manager. | None | Ops |
| **0.2** | Enable WAF + rate limiting (e.g. Cloudflare) in front of app. | None | Ops |
| **0.3** | Add CORS middleware with allowlist from env (`CORS_ORIGINS`). | None | Dev ✅ Done |
| **0.4** | Enforce HTTPS at reverse proxy; HSTS header. | None | Ops |
| **1.1** | **Critical:** Add auth to object storage: protect `POST /api/uploads/request-url`, `PUT /api/local-upload/:id`, `GET /api/local-object/uploads/:id`, and `/objects` with `isAuthenticated`. Optionally bind upload to session (short-lived token). | None | Dev ✅ Done |
| **1.2** | Set `orgId` on document create from current user’s profile; ensure `getRequestOrgId(req)` used everywhere. | None | Dev ✅ Done |
| **1.3** | Add org filter to `canAccessDocument`: require `doc.orgId === requestOrgId` for non-superadmin (or keep uploader check within same org). | None | Dev ✅ Done |
| **1.4** | Add org filter to `getAuditEvents(orgId)`, `getSchemas(orgId)`, `getUserProfiles(orgId)` and use in routes. | None | Dev ✅ Done |
| **1.5** | Enforce org on `PATCH users/:userId` and `PATCH schemas/:id`: target must be in request org. | None | Dev ✅ Done |
| **1.6** | (Optional) Add Postgres RLS on `documents`, `audit_events`, `document_schemas`, `user_profiles` with policies by `org_id`. | Low risk | Dev |
| **2.1** | Centralize permission layer: e.g. `requireOrgAdmin`, `requireCanAccessDocument(docId)`, `requireSameOrg(orgId)`. | None | Dev |
| **2.2** | Extend audit: log admin actions (user role change, schema create/update, annotation create/update). | None | Dev |
| **3.1** | Validate all path params (id, userId, docType) with Zod; return 400 when invalid. | None | Dev |
| **3.2** | Set cookie `sameSite: 'strict'` (or `lax` if needed); add CSRF token or Origin check for state-changing requests. | None | Dev |
| **4.1** | Add error monitoring (e.g. Sentry); add security log events (login fail, 403, export). | None | Dev |
| **5.1** | Data inventory; update Privacy/ToS; DPA template; incident response plan. | N/A | Legal/Ops |

---

## 4) Tests (tenant isolation and RBAC)

Implemented in `tests/security-retrofit.test.ts`. Run: `npm run test:security`.

| Test | Expectation |
|------|-------------|
| Unauthenticated `GET /api/documents/1/export` | 401 |
| Unauthenticated `POST /api/uploads/request-url` | 401 |
| Unauthenticated `GET /api/documents/1`, `/api/audit`, `/api/schemas`, `/api/users` | 401 |
| Missing tenant context (no orgId in profile) | 403 |
| Viewer calling `GET /api/audit` | 403 (Admin required) |
| Admin with orgId `GET /api/audit`, `GET /api/schemas` | 200 (or 500 if DB unavailable in test env) |
| Cross-tenant document access (user org 2, doc in org 1) | 404 / 403 / 500 |

**Test stub:** When `NODE_TEST=1`, header `X-Test-User-Profile` (base64 JSON `{ userId, orgId?, role? }`) sets session and profile so 403/tenant tests run without a real login or DB.

---

## Rollback

- **CORS / rate limit / auth on storage:** Revert middleware and route changes; redeploy.
- **Org filters:** Revert storage/route changes; ensure no DB migration that drops columns. Feature-flag org checks if desired.
- **RLS:** Disable policies or revert migration.

---

## References

- `docs/SECURITY_EXPORT_FEATURE.md` — Export endpoint security
- `docs/PRIVACY.md` — Privacy and retention
- `AGENTS.md` — Agent guardrails (no PII in logs, no legal advice)
