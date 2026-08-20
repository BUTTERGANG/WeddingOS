# WeddingOS

All-in-one wedding vendor platform — CRM, client galleries, email, timeline, invoicing, print store, and website hosting.

**Vision:** One platform that replaces HoneyBook, Pixieset, ShootProof, Calendly, and DocuSign for wedding photographers and creative vendors.

Scaffolded from [AGENT-PLAYBOOK](v1.0.0) on 2026-08-20.

---

## Why This Exists

The wedding vendor software market is fragmented. Photographers juggle:
- **HoneyBook** ($39/mo) — CRM, invoices, contracts
- **Pixieset** ($40/mo) — client galleries, print store
- **Calendly** ($16/mo) — booking
- **DocuSign** ($40/mo) — contracts
- **Wave** (free) — accounting

**Total: ~$135/mo across 5 tools.** WeddingOS bundles the core 80% into one product for $19-79/mo.

---

## What We Already Have

| Module | Source Repo | Status |
|--------|-------------|--------|
| Timeline builder + guest management | WEDDINGTIMELINE | ✅ Core built, needs multi-tenant |
| Email delivery + 2FA + transactional | MORAN-WEBSITE | ✅ Production-tested (AgentMail, SMTP fallback) |
| Stripe payments + webhooks | MORAN-WEBSITE | ✅ Production-tested (checkout, refunds, tax, shipping) |
| Media gallery + lightbox + video | LA-MEDIA-WEBSITE | ✅ Built, needs client auth + proofing |
| Pricing calculator (50-state) | PHOTO | ✅ Standalone HTML, needs integration |
| Market research ($16.2B industry data) | PHOTO | ✅ Complete |
| Print store (Printify sync) | MORAN-WEBSITE | ✅ Production-tested, needs photo-lab adapter |
| Auth (session, roles, 2FA, passwordless) | MORAN-WEBSITE | ✅ Production-tested |
| Vendor/contact database | PHOTO | ✅ Research data, needs app integration |
| UI Component Library (lucide-react + Tailwind) | WeddingOS | ✅ Reusable components (Button, Badge, Card, Skeleton, EmptyState, Input, Select, PageHeader, LoadingSpinner) |
| DESIGN.md Design System | WeddingOS | ✅ Documented brand colors, typography, and component reference |

---

## Features

### ✅ Timeline Planner
Drag-and-drop wedding timeline builder with sortable events, categories, and color coding. Ported from WEDDINGTIMELINE.

### ✅ Client Galleries
Password-protected photo galleries with lightbox viewing, drag-and-drop upload, and print storefront integration.

### ✅ Invoicing & Payments
Create invoices with line items, track status (draft/sent/paid/overdue), Stripe integration.

### ✅ Contract Builder & E-Signature
Templated contracts with merge fields ({clientName}, {weddingDate}, etc.), send-for-signature workflow, and PDF download.

### ✅ Calendar Booking
Public booking embed with available slots, service type selection, and booking management. Powered by react-day-picker.

### ✅ Blog & SEO Website Pages
Full blog engine with categories, tags, SEO metadata, scheduled publishing. Custom site pages with homepage selection.

### ✅ Vendor Marketplace
Directory of wedding vendors with search, filtering by service category/location, vendor profiles, and inquiry system.

### ✅ Partner Management
Multi-vendor collaboration with shared client records, partner connections, and shared client views.

### ✅ Print Store
Photo print ordering via integrated print store with product categories (prints, canvas, metal, books), cart management, and checkout.

## UI Component Library
Consistent design system with reusable components built on Tailwind CSS and lucide-react icons. See `DESIGN.md` for full reference.

---

## Getting Started

### Local Development

```bash
# Install dependencies
pnpm install

# Push DB schema (needs APP_DATABASE_URL or APP_DATABASE_DEVELOPMENT)
pnpm db:push

# Start API server (needs AGENTMAIL + STRIPE_SECRET_KEY)
pnpm dev

# Start frontend dev server (Vite, proxies /api to :5000)
cd packages/app && pnpm dev

# Run smoke tests (needs API running)
SMOKE_API=http://localhost:5000 npx tsx packages/api/scripts/smoke.ts
```

### Replit

1. **Fork/import** this repo into Replit
2. **Set Secrets** (Tools > Secrets): `APP_DATABASE_URL`, `AGENTMAIL_API_KEY`, `STRIPE_SECRET_KEY`
3. **Run** — the `.replit` config handles `pnpm dev` automatically
4. **Deploy** — Replit uses the `[deployment]` section: `pnpm build && pnpm start`

The API runs on port 5000. Vite proxies `/api` requests to it.

## Reference

Before building, read the [AGENT-PLAYBOOK](https://github.com/BUTTERGANG/AGENT-PLAYBOOK) for the full 5-phase development checklist, reference docs, and lessons-learned log.