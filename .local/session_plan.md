# Objective
Fix the extraction failure (signed URL 401 error) and add a document annotation feature where admins can upload a template document, draw bounding boxes on it, and label fields (e.g., "IC Number", "Full Name", "Address"). The AI extraction will then use these visual annotations as guidance to know exactly where to find data on new documents of that type.

# Tasks

### T001: Fix Extraction - Read File as Base64 Instead of Signed URL
- **Blocked By**: []
- **Details**:
  - The `signObjectURL` call fails with 401 in development. Instead, read the file content directly from object storage using `getObjectEntityFile()` + `createReadStream()` and convert to base64
  - Update `server/extraction.ts` to accept base64 data URI instead of a URL
  - Update `server/routes.ts` extraction route to read the file as buffer and pass base64 to extraction
  - Files: `server/routes.ts`, `server/extraction.ts`
  - Acceptance: Extraction works without signed URL errors

### T002: Add Annotations Database Table + API
- **Blocked By**: []
- **Details**:
  - Create `document_annotations` table in schema: id (serial), docType (text), templateStorageKey (text), annotations (jsonb - array of {x, y, width, height, label}), createdBy (varchar), createdAt (timestamp)
  - Add storage methods: getAnnotationByDocType, createAnnotation, updateAnnotation
  - Add API routes: GET /api/annotations/:docType, POST /api/annotations, PATCH /api/annotations/:id
  - Push schema to DB
  - Files: `shared/schema.ts`, `server/storage.ts`, `server/routes.ts`, `shared/routes.ts`
  - Acceptance: Annotations table exists, CRUD API works

### T003: Build Annotation UI - Template Upload + Canvas Drawing
- **Blocked By**: [T002]
- **Details**:
  - Create new page `client/src/pages/Annotate.tsx` accessible from Admin sidebar
  - Page flow: Select doc type → Upload template image or view existing → Draw bounding boxes on a canvas overlay → Label each box → Save
  - Canvas-based annotation tool: click-drag to draw rectangles, double-click to label, delete key to remove selected
  - Show list of current annotations with field labels
  - Register route `/admin/annotations` in App.tsx and add to admin sidebar items
  - Create `client/src/hooks/use-annotations.ts` for API hooks
  - Files: `client/src/pages/Annotate.tsx`, `client/src/App.tsx`, `client/src/components/AppSidebar.tsx`, `client/src/hooks/use-annotations.ts`, `client/src/components/Layout.tsx`
  - Acceptance: Admin can upload a template, draw boxes, label them, and save annotations per doc type

### T004: Integrate Annotations into AI Extraction
- **Blocked By**: [T001, T002]
- **Details**:
  - When extracting, fetch annotations for the doc type from DB
  - Include annotation info in the AI prompt: describe labeled regions with their approximate positions
  - Send the annotated template image alongside the actual document so AI can cross-reference
  - Files: `server/extraction.ts`, `server/routes.ts`
  - Acceptance: AI extraction uses annotation labels and positions to guide field extraction
