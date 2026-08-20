---
status: backlog
priority: P2
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 2 — Print Store (Photo Lab API)

> **Repo:** WeddingOS
> **Description:** Client print ordering from photo galleries via photo lab fulfillment API

---

## Context

MORAN-WEBSITE has Printify integration for apparel — catalog sync, Stripe checkout, webhook order fulfillment. Adapt this pattern for photo prints. Instead of Printify, integrate with professional photo labs (Mpix, Bay Photo, WHCC, Miller's) that photographers already use.

---

## Acceptance Criteria

- [ ] Photo lab API integration (Mpix or WHCC — most photographer-friendly)
- [ ] Product catalog sync (print sizes, finishes, framing options, pricing)
- [ ] Client-facing storefront within gallery view
- [ ] Cart + Stripe checkout (adapt from MORAN)
- [ ] Order status tracking in client portal
- [ ] Photographer profit margin configuration (markup on lab pricing)

---

## Technical Notes

- Mpix API: https://www.mpix.com/api — consumer-facing, good documentation
- WHCC API: https://www.whcc.com/api — professional lab, used by most wedding photographers
- Adapt MORAN's Printify sync pattern (products table, upsert sync, webhook fulfillment)
- Shipping is flat-rate from labs (US only for v1)