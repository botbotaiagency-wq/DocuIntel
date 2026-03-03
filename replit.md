# DocuIntel - Secure Document Intelligence Web App

## Overview
A web application for legal and identity document extraction (PDF/PNG/JPG). Supports multi-document types (IC, Geran/Land Title, Will, Other), features a human-in-the-loop review workflow, RBAC, audit logging, and AI-powered extraction via OpenAI Vision.

## Tech Stack
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, TanStack Query, Wouter routing
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (OIDC)
- **Storage**: Replit Object Storage (GCS-backed)
- **AI**: OpenAI GPT-4o Vision (via Replit AI Integrations)

## Architecture
- `client/` - React frontend (Vite)
- `server/` - Express backend
- `shared/` - Shared schemas, types, and API route definitions
- `docs/` - Security, privacy, and threat model documentation

## Key Features
1. **Document Upload**: Select document type first (IC, Geran, Will, Other), then upload file or capture via camera
2. **AI Extraction**: OpenAI GPT-4o Vision extracts structured data from documents
3. **Review Queue**: Dedicated page for documents flagged as "review_required"
4. **Dashboard**: Document list with status, type labels, extract, view, and delete actions
5. **Admin Panel**: Schema management (create/edit), User management, Org settings
6. **Audit Log**: Full audit trail of all document operations
7. **PDF Preview**: Server-side proxy route (`/api/documents/:id/preview`) to avoid Chrome cross-origin blocking

## Database Tables
- `orgs` - Organizations
- `user_profiles` - User roles (Admin, Reviewer, Uploader, Viewer) linked to Replit users
- `documents` - Uploaded documents with docType, status, storage key
- `extractions` - AI extraction results with confidence scores and validation reports
- `audit_events` - Audit trail
- `document_schemas` - JSON schemas for each document type
- `users` / `sessions` - Replit Auth tables

## Validation Rules
- IC: Gender auto-detect from name (A/L, bin = Male; A/P, binti, bt = Female)
- IC: Format check (XXXXXX-XX-XXXX)
- IC: DOB consistency with IC prefix

## API Routes
- Documents: CRUD, upload, extract, preview proxy, review approve/update
- Schemas: List, create, update (PATCH)
- Users: List, create, update role
- Audit: List events
- Org: Update settings

## Important Notes
- Signed GCS URLs fail for iframe PDF preview (Chrome blocks cross-origin). Use `/api/documents/:id/preview` proxy instead.
- Object storage uses presigned URL flow for uploads (2-step: get URL, then PUT binary)
- The `docType` field is stored on both documents and extractions tables
