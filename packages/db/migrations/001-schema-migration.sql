-- WeddingOS Schema Migration
-- Adds columns and tables from Phases 2 & 3 to the Phase 1 database.
-- The DB was seeded from commit c408095 (11 tables). Schema grew to 24 tables.
-- Run this against the Neon database to bring it up to date.

-- ============================================================
-- Part 1: Add new columns to existing tables
-- ============================================================

-- vendors: 5 new columns (Phase 3 marketplace)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_categories text[] DEFAULT '{}';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS profile_image text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_visible_in_marketplace boolean DEFAULT false;

-- ============================================================
-- Part 2: Create new tables (Phase 2 — Print Store)
-- ============================================================

CREATE TABLE IF NOT EXISTS print_products (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'print',
  price_cents INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS print_products_vendor_id_idx ON print_products(vendor_id);

CREATE TABLE IF NOT EXISTS print_orders (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gallery_id INTEGER REFERENCES galleries(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  shipping_cents INTEGER DEFAULT 0,
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT print_orders_status_check CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS print_orders_vendor_id_idx ON print_orders(vendor_id);
CREATE INDEX IF NOT EXISTS print_orders_client_id_idx ON print_orders(client_id);

CREATE TABLE IF NOT EXISTS print_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES print_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES print_products(id) ON DELETE SET NULL,
  image_id INTEGER REFERENCES gallery_images(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  image_filename TEXT
);

CREATE INDEX IF NOT EXISTS print_order_items_order_id_idx ON print_order_items(order_id);

-- ============================================================
-- Part 3: Create new tables (Phase 2 — Blog & Site Pages)
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_categories_vendor_slug_idx ON blog_categories(vendor_id, slug);
CREATE INDEX IF NOT EXISTS blog_categories_vendor_id_idx ON blog_categories(vendor_id);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMP,
  tags TEXT[] DEFAULT '{}'::text[],
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published', 'scheduled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_vendor_slug_idx ON blog_posts(vendor_id, slug);
CREATE INDEX IF NOT EXISTS blog_posts_vendor_id_idx ON blog_posts(vendor_id);
CREATE INDEX IF NOT EXISTS blog_posts_category_id_idx ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts(status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts(published_at);

CREATE TABLE IF NOT EXISTS site_pages (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  is_homepage BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_pages_vendor_slug_idx ON site_pages(vendor_id, slug);
CREATE INDEX IF NOT EXISTS site_pages_vendor_id_idx ON site_pages(vendor_id);

-- ============================================================
-- Part 4: Create new tables (Phase 3 — Admin Platform)
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('superadmin', 'admin'))
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_sessions_admin_user_id_idx ON admin_sessions(admin_user_id);

CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_settings_key_idx ON platform_settings(key);

-- ============================================================
-- Part 5: Create new tables (Phase 3 — Multi-Vendor & Marketplace)
-- ============================================================

CREATE TABLE IF NOT EXISTS vendor_partner_connections (
  id SERIAL PRIMARY KEY,
  from_vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  to_vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT vpc_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
);

CREATE INDEX IF NOT EXISTS vpc_from_vendor_id_idx ON vendor_partner_connections(from_vendor_id);
CREATE INDEX IF NOT EXISTS vpc_to_vendor_id_idx ON vendor_partner_connections(to_vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS vpc_unique_pair_idx ON vendor_partner_connections(from_vendor_id, to_vendor_id);

CREATE TABLE IF NOT EXISTS shared_clients (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  owner_vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'read',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT shared_clients_permission_check CHECK (permission IN ('read', 'write', 'admin'))
);

CREATE INDEX IF NOT EXISTS shared_clients_client_id_idx ON shared_clients(client_id);
CREATE INDEX IF NOT EXISTS shared_clients_vendor_id_idx ON shared_clients(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS shared_clients_unique_pair_idx ON shared_clients(client_id, vendor_id);

CREATE TABLE IF NOT EXISTS vendor_inquiries (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  wedding_date DATE,
  venue TEXT,
  message TEXT NOT NULL,
  service_interest TEXT,
  status TEXT DEFAULT 'new',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT vendor_inquiries_status_check CHECK (status IN ('new', 'read', 'replied', 'archived'))
);

CREATE INDEX IF NOT EXISTS vendor_inquiries_vendor_id_idx ON vendor_inquiries(vendor_id);