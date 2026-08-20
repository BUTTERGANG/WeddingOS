# WeddingOS on Replit

## Run the app

Use the **Start application** workflow, which runs `pnpm dev`.

- The React/Vite frontend serves the Replit preview on port 5000.
- The Express API runs internally on port 5001.
- Frontend requests to `/api` and `/stripe` are proxied to the API.

## Required setup for database-backed features

Add one of these secrets before using API features that read or write data:

- `APP_DATABASE_URL` — preferred PostgreSQL connection string
- `APP_DATABASE_DEVELOPMENT` — development-only PostgreSQL connection string

After adding a database URL, run `pnpm db:push` once to apply the Drizzle schema.

## Optional integrations

- Email: `AGENTMAIL_API_KEY` or SMTP settings
- Payments: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- Uploads: the S3-compatible settings listed in `.env.example`