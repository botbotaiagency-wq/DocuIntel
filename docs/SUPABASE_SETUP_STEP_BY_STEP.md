# Supabase DB setup – step by step

Follow these steps to connect DocuIntel to your Supabase database and create the tables.

---

## Step 1: Get your connection string from Supabase

1. Open: **https://supabase.com/dashboard** and sign in.
2. Click your project (**wipjihdqzqwaqieybnrp** or its name).
3. In the left sidebar, click the **gear icon** (Project Settings).
4. Click **Database** in the left menu.
5. Scroll to **Connection string**.
6. Select the **URI** tab.
7. You’ll see a string like:
   ```text
   postgresql://postgres.wipjihdqzqwaqieybnrp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
8. Click **Copy** (or select and copy).
9. Paste it into Notepad (or any editor). Replace **`[YOUR-PASSWORD]`** with your real database password.
   - If your password has **`+`** or **`=`**, try it as-is first. If connection fails, replace only **`+`** with **`%2B`** in the password part.
10. At the **end** of the string, add: **`?sslmode=require`**  
    (if there’s already a `?` in the URL, use **`&sslmode=require`** instead.)

You should end up with something like (with your real password and host):

```text
postgresql://postgres.wipjihdqzqwaqieybnrp:YourPasswordHere@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Important:** Supabase’s database name is always **`postgres`**. Do not use `/docuintel` or any other name — the path must end with **`/postgres`**.

Keep this string; you’ll use it in Step 2 and Step 4.

---

## Step 2: Create `.env` in your project (local)

1. Open your project folder in VS Code (or any editor).
2. In the **root** of the project (same folder as `package.json`), create a file named **`.env`** (with the dot at the start).
3. Open `.env` and add these lines (replace the first value with your full connection string from Step 1):

```env
DATABASE_URL=postgresql://postgres.wipjihdqzqwaqieybnrp:YOUR_PASSWORD@aws-0-XX.pooler.supabase.com:5432/postgres?sslmode=require
SESSION_SECRET=any-long-random-string-at-least-32-chars
USE_LOCAL_STORAGE=1
```

4. Save the file.  
   **Important:** `.env` is in `.gitignore` — do not commit it. Never put `.env` in git.

To generate a strong `SESSION_SECRET`, run in a terminal (in your project folder):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `SESSION_SECRET` in `.env`.

---

## Step 3: Create the tables in Supabase (run schema)

Your app expects tables like `users`, `documents`, `sessions`, etc. You create them once by “pushing” the schema from your code to Supabase.

1. Open a terminal in your project root (where `package.json` is).
2. Install dependencies if you haven’t:

   ```bash
   npm install
   ```

3. Run:

   ```bash
   npm run db:push
   ```

4. You should see output like “Pushing schema…” and no errors. That creates/updates all tables in your Supabase database.

5. (Optional) Create an admin user so you can log in:

   ```bash
   npm run seed:admin
   ```

   Follow the prompts (e.g. username/password for the admin).

---

## Step 4: Use the same DB on Vercel

So the **deployed** app uses the same Supabase database:

1. Go to **https://vercel.com** → your project (DocuIntel).
2. Open **Settings** → **Environment Variables**.
3. Add:

   - **Name:** `DATABASE_URL`  
     **Value:** the same full connection string from Step 1 (with password and `?sslmode=require`).  
     **Environment:** Production (and Preview if you want).

   - **Name:** `SESSION_SECRET`  
     **Value:** the same long random string you used in `.env` (or generate a new one with the `node -e "console.log(require('crypto')...)"` command).  
     **Environment:** Production (and Preview if you want).

4. Save. Then trigger a **Redeploy** (Deployments → … on latest → Redeploy).

You do **not** run `db:push` on Vercel. Tables are already in Supabase from Step 3; Vercel only needs `DATABASE_URL` and `SESSION_SECRET`.

---

## Step 5: Check that it works

- **Local:** In the project root run `npm run dev`, open the app in the browser, and log in (if you ran `seed:admin`).
- **Vercel:** Open your deployment URL; the app should load and no longer show “DATABASE_URL is not set” or 500 on `/api/auth/user`.

---

## Quick checklist

- [ ] Supabase: Connection string copied, password and `?sslmode=require` added.
- [ ] Local: `.env` created with `DATABASE_URL` and `SESSION_SECRET`.
- [ ] Terminal: `npm run db:push` run successfully.
- [ ] (Optional) `npm run seed:admin` run.
- [ ] Vercel: `DATABASE_URL` and `SESSION_SECRET` added in Environment Variables and project redeployed.

If something fails (e.g. “connection refused”, “password authentication failed”, “relation does not exist”), say which step and the exact error message and we can fix it.
