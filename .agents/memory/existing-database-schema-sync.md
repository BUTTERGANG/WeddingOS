---
name: Existing database schema sync
description: Safe schema-change handling for the WeddingOS database — the Neon DB needs migration to match the current schema.
---

The WeddingOS Neon database was seeded from Phase 1 (11 tables at commit c408095) and is missing 13 tables and 6 vendor columns added in Phases 2 and 3. Running `pnpm db:push` via Drizzle Kit fails because the Neon pooler's named NOT NULL constraints conflict with Drizzle's schema diffing.

**What's missing (vs current schema at HEAD):**
- 6 vendor columns: description, city, state, service_categories, profile_image, is_visible_in_marketplace
- 13 tables: print_products, print_orders, print_order_items, blog_categories, blog_posts, site_pages, admin_users, admin_sessions, platform_settings, vendor_partner_connections, shared_clients, vendor_inquiries

**How to apply:** Run the SQL migration script at `packages/db/migrations/001-schema-migration.sql` directly against the Neon database:

```
psql "$APP_DATABASE_URL" -f packages/db/migrations/001-schema-migration.sql
```

Or run it from a tsx script that uses the postgres client. The script uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so it's safe to re-run.