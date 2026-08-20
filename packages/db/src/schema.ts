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

// ── Sessions ─────────────────────────────────────────────────────────────────
// Vendor authentication sessions.

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