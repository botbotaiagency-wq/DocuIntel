# Secure Document Intelligence

Web app for secure document ingestion, classification, extraction, and review (IC, Geran, Will, Other).

## Local development (full app with database)

To test the full web app locally (users, documents, annotations, audit) you need PostgreSQL running.

### Option A: One-time setup script (Windows PowerShell)

From the project root:

```powershell
npm run setup:db
```

Or run the script directly: `.\scripts\setup-local-db.ps1`

This script will:

1. **Start Postgres** – If Docker is installed, it starts a `docuintel-pg` container. Otherwise it prints instructions to install Postgres (e.g. `winget install PostgreSQL.PostgreSQL.16`).
2. **Wait** for Postgres on port 5432.
3. **Set** `DATABASE_URL` in `.env` if missing.
4. **Push** the schema (`npm run db:push`).
5. **Seed** the admin user (`npm run seed:admin`).

Then run `npm run dev` and log in with **admin** / **admin123**.

### Option B: Manual setup

**1. Install Node.js 18+**

**2. Install and start PostgreSQL**

- **With Docker:**
  ```bash
  docker run -d --name docuintel-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=docuintel postgres:16
  ```
- **On Windows (no Docker):** install Postgres, then create the database:
  ```powershell
  winget install PostgreSQL.PostgreSQL.16
  ```
  After install, ensure the PostgreSQL service is running. Create a database named `docuintel` (e.g. in pgAdmin or: `psql -U postgres -c "CREATE DATABASE docuintel;"`).

**3. Environment**

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` – e.g. `postgresql://postgres:postgres@localhost:5432/docuintel` (use the password you set for the `postgres` user).
- `SESSION_SECRET` – any long random string.
- `USE_LOCAL_STORAGE=1` – use local filesystem for document storage.

Optional for AI extraction: `AI_INTEGRATIONS_OPENAI_API_KEY` or `OPENAI_API_KEY`.

**4. Install deps, schema, and admin user**

```bash
npm install
npm run db:push
npm run seed:admin
```

**5. Run**

```bash
npm run dev
```

Open **http://localhost:5000** and log in with **admin** / **admin123**.

- **Auth**: Local login (username/password); sessions stored in Postgres.
- **Storage**: With `USE_LOCAL_STORAGE=1`, uploads go to `./local-storage/`.
- **Extraction**: Needs an OpenAI API key; otherwise extraction returns a clear error.

### Document schema vs annotations

- **Document schemas** (Admin → Document Schemas) define the **structure** of extracted data: which fields exist, their types, and validation rules (e.g. JSON Schema). They answer: *what* to extract.
- **Annotations** (Admin → Annotations) define **where** on the document image each field is located: bounding boxes (x, y, width, height) and labels. They answer: *where* to look.

Both are used together: the schema defines the output shape; annotations guide the extractor to the right regions so extraction is more accurate. You can change annotations (e.g. move a box, rename a label) and re-run extraction; you can change schemas to add or remove fields.

## Development without database (Local Dev Admin)

If you run the app without PostgreSQL (e.g. only `npm run dev` and log in as **admin** / **admin123**), the server uses an in-memory store for the dev user: uploads, documents, annotations, and extractions are saved for the session and lost on restart. This lets you test upload, annotation saving, and extraction using saved annotations without a database.

## Production

- Set `NODE_ENV=production`.
- Use a real Postgres and session secret.
- On Replit, use Replit Auth and object storage (do not set `USE_LOCAL_STORAGE`).
