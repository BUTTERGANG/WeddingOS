---
status: backlog
priority: P1
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 1 — Email + Invoicing (AgentMail + Stripe)

> **Repo:** WeddingOS
> **Description:** Transactional email delivery and Stripe invoicing/payment flow

---

## Context

MORAN-WEBSITE has production-tested email (AgentMail + SMTP fallback) and Stripe payment flows (checkout sessions, webhooks with idempotency, refunds, tax, shipping). Extract these patterns into WeddingOS and adapt for the vendor billing model.

---

## Acceptance Criteria

- [ ] AgentMail integration for transaction emails (invites, invoices, gallery notifications)
- [ ] SMTP fallback when AgentMail is unconfigured
- [ ] Stripe Checkout for one-off invoices and subscription billing
- [ ] Webhook handler with idempotency keys (pattern from MORAN-WEBSITE)
- [ ] Invoice PDF generation with vendor branding
- [ ] Payment status tracking per invoice (pending, paid, overdue, refunded)

---

## Technical Notes

- Source patterns: MORAN-WEBSITE replit.md lines 15, 48-55, 70-75
- AgentMail: docs.agentmail.to — multi-inbox under one root account
- Stripe: Checkout Sessions for payments, webhooks for lifecycle events
- Use AgentMail's `sendTransactional()` pattern (NOT the bare `send()` that silently no-ops)