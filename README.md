# Secure Document Intelligence

Web app for secure document ingestion, classification, extraction, and review (IC, Geran, Will, Other).

## Local development

### 1. Prerequisites

- **Node.js** 18+
- **PostgreSQL** (local or cloud). Example with Docker:
  ```bash
  docker run -d --name docuintel-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=docuintel postgres:16
  ```

### 2. Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` – e.g. `postgresql://postgres:postgres@localhost:5432/docuintel`
- `SESSION_SECRET` – any long random string (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `USE_LOCAL_STORAGE=1` – use local filesystem for document storage (no Replit/GCS)

Optional for AI extraction:

- `AI_INTEGRATIONS_OPENAI_API_KEY` or `OPENAI_API_KEY`

### 3. Install and database

```bash
npm install
npm run db:push
npm run seed:admin
```

Default seed admin: **username** `admin`, **password** `admin123`. Change via `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` in `.env`.

### 4. Run

```bash
npm run dev
```

Open **http://localhost:5000** and log in with the seed admin user.

- **Auth**: Local login only when not on Replit (`/api/auth/login` with username/password).
- **Storage**: With `USE_LOCAL_STORAGE=1`, uploads are stored under `./local-storage/`.
- **Extraction**: Requires an OpenAI API key; otherwise extraction will fail with a clear error.

## Production

- Set `NODE_ENV=production`.
- Use a real Postgres and session secret.
- On Replit, use Replit Auth and object storage (do not set `USE_LOCAL_STORAGE`).
