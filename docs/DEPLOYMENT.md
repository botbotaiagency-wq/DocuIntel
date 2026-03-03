# Deployment Notes

## Environment Variables
Ensure the following environment variables are set in your production environment:
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Secret used for signing session cookies.
- `REPL_ID`: Automatically injected by Replit, required for OIDC Auth.
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`: Automatically injected by Replit Object Storage.
- `AI_INTEGRATIONS_OPENAI_API_KEY`: Automatically injected by Replit AI Integrations.

## Database Migrations
Migrations are applied automatically via Drizzle `push`.
In a managed production environment, consider using `npm run db:migrate` instead, ensuring you generate migration files locally first with `npx drizzle-kit generate`.

## Object Storage
Files are uploaded via presigned URLs. Ensure the frontend `useUpload` hook points to the correct domain if customizing.

## Access Control
Review roles in `shared/schema.ts` (`userProfiles` table) to configure admin and reviewer permissions.