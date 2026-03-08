# Connect DocuIntel to Supabase

Supabase provides PostgreSQL. Use it for local development and for Vercel deployments.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name, database password, region.
3. Wait for the project to be ready.

## 2. Get the connection string

1. In the Supabase dashboard: **Project Settings** (gear) → **Database**.
2. Under **Connection string**, select **URI**.
3. Copy the URI. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password.
5. For **Vercel (serverless)**, use the **Session mode** pooler (port **5432**).  
   If you use the Transaction pooler (port 6543), add `?pgbouncer=true` if you use prepared statements.
6. Ensure SSL is used: if the URI has no `?`, add `?sslmode=require`; otherwise add `&sslmode=require`.

Example final URI:

```text
postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

## 3. Local development

1. Copy `.env.example` to `.env`.
2. Set in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@...?sslmode=require
   SESSION_SECRET=your-long-random-secret
   ```
3. Push the schema and create tables:
   ```bash
   npm run db:push
   ```
4. (Optional) Seed an admin user:
   ```bash
   npm run seed:admin
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## 4. Vercel deployment

1. In the **Vercel** project: **Settings** → **Environment Variables**.
2. Add:
   - **`DATABASE_URL`** = your Supabase URI (same as above, with password and `?sslmode=require`).
   - **`SESSION_SECRET`** = a long random string (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Redeploy the project.

Tables are created when you run `db:push` (or migrations) against the same `DATABASE_URL`; you can run that from your local machine with the same URI.

## 5. Session store

The app uses **connect-pg-simple** for sessions in production when `DATABASE_URL` is set. It will create a `session` table in your Supabase DB on first use (if `createTableIfMissing: true`). No extra Supabase config is required.

## Troubleshooting

- **Connection refused / timeout**  
  Use the **Session mode** (port 5432) URI from Supabase for Vercel. Avoid the direct “Direct connection” for serverless.

- **SSL errors**  
  Ensure the URI includes `?sslmode=require` (or `&sslmode=require` if there are other query params). The app also enables SSL for `supabase.com` URLs if `sslmode` is missing.

- **Tables missing**  
  Run `npm run db:push` locally with the same `DATABASE_URL` to create/update tables in your Supabase project.
