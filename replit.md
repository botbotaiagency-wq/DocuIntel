# DocuIntel - Secure Document Intelligence Web App

## Overview
A web application for legal and identity document extraction (PDF/PNG/JPG). Supports multi-document types (IC, Geran/Land Title, Will, Other), features a human-in-the-loop review workflow, RBAC, audit logging, and AI-powered extraction via OpenAI Vision.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, TanStack Query, Wouter routing
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Custom username/password authentication with bcryptjs hashed passwords, session-based (express-session with PostgreSQL store)
- **Storage**: Replit Object Storage (GCS-backed)
- **AI**: OpenAI GPT-4o Vision (via Replit AI Integrations)

## Architecture
- `client/` - React frontend (Vite)
- `server/` - Express backend
- `shared/` - Shared schemas, types, and API route definitions
- `docs/` - Security, privacy, and threat model documentation

## Key Features
1. **Staff Login**: Username/password authentication. Each staff has their own credentials created by an Admin.
2. **Personalized Dashboard**: Staff see only their own uploaded documents. Admins see all documents across all staff with "Uploaded By" attribution.
3. **Document Upload**: Select document type first (IC, Geran, Will, Other), then upload file or capture via camera
4. **AI Extraction**: OpenAI GPT-4o Vision extracts structured data from documents
5. **Review Queue**: Dedicated page for documents flagged as "review_required"
6. **Admin Panel**: Schema management (create/edit), User management (create staff with username/password/role), Org settings
7. **Audit Log**: Full audit trail of all document operations
8. **PDF Preview**: Server-side proxy route (`/api/documents/:id/preview`) to avoid Chrome cross-origin blocking
9. **RBAC**: Admin role sees all admin features and all documents. Other roles (Reviewer, Uploader, Viewer) see only their own documents.

## Database Tables
- `orgs` - Organizations
- `users` - User accounts with username, passwordHash, email, names
- `user_profiles` - User roles (Admin, Reviewer, Uploader, Viewer) linked to users
- `documents` - Uploaded documents with docType, status, storage key, uploaderUserId
- `extractions` - AI extraction results with confidence scores and validation reports
- `audit_events` - Audit trail
- `document_schemas` - JSON schemas for each document type
- `sessions` - Session store for express-session

## Default Admin Account
- Username: `admin`
- Password: `admin123`
- Role: Admin

## Auth System
- Custom username/password login at `/api/auth/login` (POST)
- Session-based auth stored in PostgreSQL sessions table
- Logout at `/api/auth/logout` (POST)
- Current user at `/api/auth/user` (GET) - returns user data plus role and displayName
- Replit Auth OIDC is also supported as a fallback
- `isAuthenticated` middleware checks session.userId first, then falls back to Replit Auth token

## Validation Rules
- IC: Gender auto-detect from name (A/L, bin = Male; A/P, binti, bt = Female)
- IC: Format check (XXXXXX-XX-XXXX)
- IC: DOB consistency with IC prefix

## API Routes
- Documents: CRUD, upload, extract, preview proxy, review approve/update
- Schemas: List, create, update (PATCH)
- Users: List, create (with username/password/role), update role
- Audit: List events
- Org: Update settings
- Auth: Login, logout, get current user

## Important Notes
- Signed GCS URLs fail for iframe PDF preview (Chrome blocks cross-origin). Use `/api/documents/:id/preview` proxy instead.
- Object storage uses presigned URL flow for uploads (2-step: get URL, then PUT binary)
- The `docType` field is stored on both documents and extractions tables
- Admin users see all documents with uploader attribution; non-admin users see only their own
- User creation by admin includes username, password (min 6 chars), display name, and role
