import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  date,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Vendors ──────────────────────────────────────────────────────────────────
// Core vendor (business) account — each vendor manages their own clients & data.

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  businessName: text("business_name"),
  businessWebsite: text("business_website"),
  phone: text("phone"),
  stripeAccountId: text("stripe_account_id"),
  description: text("description"),
  city: text("city"),
  state: text("state"),
  serviceCategories: text("service_categories").array().default(sql`'{}'`),
  profileImage: text("profile_image"),
  isVisibleInMarketplace: boolean("is_visible_in_marketplace").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Clients ──────────────────────────────────────────────────────────────────
// A wedding client belonging to a vendor.

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    partnerName: text("partner_name"),
    weddingDate: date("wedding_date"),
    venue: text("venue"),
    notes: text("notes"),
    status: text("status").default("lead"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("clients_vendor_id_idx").on(table.vendorId),
    statusCheck: check(
      "clients_status_check",
      sql`${table.status} IN ('lead', 'active', 'archived')`,
    ),
  }),
);

// ── Timeline Events ──────────────────────────────────────────────────────────
// Events in a client's wedding timeline.

export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    eventDate: date("event_date"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    location: text("location"),
    category: text("category").default("general"),
    sortOrder: integer("sort_order").default(0),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("timeline_events_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("timeline_events_client_id_idx").on(table.clientId),
    categoryCheck: check(
      "timeline_events_category_check",
      sql`${table.category} IN ('ceremony', 'reception', 'photos', 'transport', 'other')`,
    ),
  }),
);

// ── Galleries ────────────────────────────────────────────────────────────────
// Photo galleries tied to a client.

export const galleries = pgTable(
  "galleries",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    passwordHash: text("password_hash"),
    isPublished: boolean("is_published").default(false),
    hasProofing: boolean("has_proofing").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("galleries_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("galleries_client_id_idx").on(table.clientId),
  }),
);

// ── Gallery Images ───────────────────────────────────────────────────────────
// Individual images within a gallery.

export const galleryImages = pgTable(
  "gallery_images",
  {
    id: serial("id").primaryKey(),
    galleryId: integer("gallery_id")
      .references(() => galleries.id, { onDelete: "cascade" })
      .notNull(),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    fileSize: integer("file_size"),
    isFavorite: boolean("is_favorite").default(false),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    galleryIdIdx: index("gallery_images_gallery_id_idx").on(table.galleryId),
  }),
);

// ── Invoices ─────────────────────────────────────────────────────────────────
// Invoices sent to a client by a vendor.

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").default("draft"),
    dueDate: date("due_date"),
    paidAt: timestamp("paid_at"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("invoices_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("invoices_client_id_idx").on(table.clientId),
    statusCheck: check(
      "invoices_status_check",
      sql`${table.status} IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')`,
    ),
  }),
);

// ── Invoice Line Items ───────────────────────────────────────────────────────
// Line items within an invoice.

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" })
      .notNull(),
    description: text("description").notNull(),
    quantity: integer("quantity").default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
  },
  (table) => ({
    invoiceIdIdx: index("invoice_line_items_invoice_id_idx").on(table.invoiceId),
  }),
);

// ── Contracts ────────────────────────────────────────────────────────────────
// Contracts between a vendor and client.

export const contracts = pgTable(
  "contracts",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    status: text("status").default("draft"),
    signedAt: timestamp("signed_at"),
    signatureData: jsonb("signature_data"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("contracts_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("contracts_client_id_idx").on(table.clientId),
    statusCheck: check(
      "contracts_status_check",
      sql`${table.status} IN ('draft', 'sent', 'signed', 'expired')`,
    ),
  }),
);

// ── Email Log ────────────────────────────────────────────────────────────────
// Audit log of emails sent by a vendor.

export const emailLog = pgTable(
  "email_log",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    body: text("body"),
    provider: text("provider").default("agentmail"),
    status: text("status").default("sent"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("email_log_vendor_id_idx").on(table.vendorId),
  }),
);

// ── Calendar Slots ───────────────────────────────────────────────────────────
// Available or booked time slots for a vendor's calendar / booking system.

export const calendarSlots = pgTable(
  "calendar_slots",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    isBooked: boolean("is_booked").default(false),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    serviceType: text("service_type"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("calendar_slots_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("calendar_slots_client_id_idx").on(table.clientId),
  }),
);

// ── Print Products ────────────────────────────────────────────────────────────
// Products available for print ordering from a vendor's gallery.
//
export const printProducts = pgTable(
  "print_products",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").default("print"),
    priceCents: integer("price_cents").notNull(),
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("print_products_vendor_id_idx").on(table.vendorId),
  }),
);

// ── Print Orders ──────────────────────────────────────────────────────────────
// Orders placed by a client for prints from a gallery.
//
export const printOrders = pgTable(
  "print_orders",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    galleryId: integer("gallery_id")
      .references(() => galleries.id, { onDelete: "set null" }),
    status: text("status").default("pending"),
    totalCents: integer("total_cents").notNull(),
    shippingCents: integer("shipping_cents").default(0),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    shippingAddress: jsonb("shipping_address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("print_orders_vendor_id_idx").on(table.vendorId),
    clientIdIdx: index("print_orders_client_id_idx").on(table.clientId),
    statusCheck: check(
      "print_orders_status_check",
      sql`${table.status} IN ('pending', 'paid', 'fulfilled', 'cancelled')`,
    ),
  }),
);

// ── Print Order Items ─────────────────────────────────────────────────────────
// Individual items within a print order.
//
export const printOrderItems = pgTable(
  "print_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .references(() => printOrders.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => printProducts.id, { onDelete: "set null" }),
    imageId: integer("image_id")
      .references(() => galleryImages.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    imageFilename: text("image_filename"),
  },
  (table) => ({
    orderIdIdx: index("print_order_items_order_id_idx").on(table.orderId),
  }),
);

// ── Blog Categories ──────────────────────────────────────────────────────────
// Categories for blog posts, scoped per vendor.

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorSlugIdx: uniqueIndex("blog_categories_vendor_slug_idx").on(
      table.vendorId,
      table.slug,
    ),
    vendorIdIdx: index("blog_categories_vendor_id_idx").on(table.vendorId),
  }),
);

// ── Blog Posts ────────────────────────────────────────────────────────────────
// Blog posts with SEO metadata, scoped per vendor.

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: integer("category_id").references(() => blogCategories.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content"),
    excerpt: text("excerpt"),
    featuredImage: text("featured_image"),
    status: text("status").default("draft"),
    publishedAt: timestamp("published_at"),
    tags: text("tags").array().default(sql`'{}'::text[]`),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorSlugIdx: uniqueIndex("blog_posts_vendor_slug_idx").on(
      table.vendorId,
      table.slug,
    ),
    vendorIdIdx: index("blog_posts_vendor_id_idx").on(table.vendorId),
    categoryIdIdx: index("blog_posts_category_id_idx").on(table.categoryId),
    statusIdx: index("blog_posts_status_idx").on(table.status),
    publishedAtIdx: index("blog_posts_published_at_idx").on(table.publishedAt),
    statusCheck: check(
      "blog_posts_status_check",
      sql`${table.status} IN ('draft', 'published', 'scheduled')`,
    ),
  }),
);

// ── Site Pages ────────────────────────────────────────────────────────────────
// Custom website pages (About, FAQ, etc.), scoped per vendor.

export const sitePages = pgTable(
  "site_pages",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content"),
    isHomepage: boolean("is_homepage").default(false),
    isPublished: boolean("is_published").default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    vendorSlugIdx: uniqueIndex("site_pages_vendor_slug_idx").on(
      table.vendorId,
      table.slug,
    ),
    vendorIdIdx: index("site_pages_vendor_id_idx").on(table.vendorId),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("sessions_vendor_id_idx").on(table.vendorId),
  }),
);

// ── Admin Users ───────────────────────────────────────────────────────────────
// Admin platform users with elevated privileges.

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role").default("admin"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("admin_users_email_idx").on(table.email),
    roleCheck: check(
      "admin_users_role_check",
      sql`${table.role} IN ('superadmin', 'admin')`,
    ),
  }),
);

// ── Admin Sessions ────────────────────────────────────────────────────────────
// Cookie-based sessions for admin users.

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .references(() => adminUsers.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    adminUserIdIdx: index("admin_sessions_admin_user_id_idx").on(table.adminUserId),
  }),
);

// ── Platform Settings ─────────────────────────────────────────────────────────
// Key-value store for platform-level configuration.

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    description: text("description"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex("platform_settings_key_idx").on(table.key),
  }),
);

// ── Vendor Partner Connections ─────────────────────────────────────────────────
// Partnership / connection between two vendors for multi-vendor collaboration.

export const vendorPartnerConnections = pgTable(
  "vendor_partner_connections",
  {
    id: serial("id").primaryKey(),
    fromVendorId: integer("from_vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    toVendorId: integer("to_vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").default("pending"),
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    fromVendorIdIdx: index("vpc_from_vendor_id_idx").on(table.fromVendorId),
    toVendorIdIdx: index("vpc_to_vendor_id_idx").on(table.toVendorId),
    uniquePair: uniqueIndex("vpc_unique_pair_idx").on(
      table.fromVendorId,
      table.toVendorId,
    ),
    statusCheck: check(
      "vpc_status_check",
      sql`${table.status} IN ('pending', 'accepted', 'rejected', 'blocked')`,
    ),
  }),
);

// ── Shared Clients ─────────────────────────────────────────────────────────────
// Clients shared between partner vendors with permission levels.

export const sharedClients = pgTable(
  "shared_clients",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    ownerVendorId: integer("owner_vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    permission: text("permission").default("read"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    clientIdIdx: index("shared_clients_client_id_idx").on(table.clientId),
    vendorIdIdx: index("shared_clients_vendor_id_idx").on(table.vendorId),
    uniqueClientVendor: uniqueIndex("shared_clients_unique_pair_idx").on(
      table.clientId,
      table.vendorId,
    ),
    permissionCheck: check(
      "shared_clients_permission_check",
      sql`${table.permission} IN ('read', 'write', 'admin')`,
    ),
  }),
);

// ── Vendor Inquiries ──────────────────────────────────────────────────────────
// Inquiries/leads from prospective clients browsing the marketplace.

export const vendorInquiries = pgTable(
  "vendor_inquiries",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .references(() => vendors.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    weddingDate: date("wedding_date"),
    venue: text("venue"),
    message: text("message").notNull(),
    serviceInterest: text("service_interest"),
    status: text("status").default("new"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    vendorIdIdx: index("vendor_inquiries_vendor_id_idx").on(table.vendorId),
    statusCheck: check(
      "vendor_inquiries_status_check",
      sql`${table.status} IN ('new', 'read', 'replied', 'archived')`,
    ),
  }),
);