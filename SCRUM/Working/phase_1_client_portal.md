---
status: backlog
priority: P1
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 1 — Client Portal

> **Repo:** WeddingOS
> **Description:** Client-facing dashboard for viewing timeline, gallery, invoices, and communicating with vendor

---

## Context

MORAN-WEBSITE has an athlete portal with workout programs, check-ins, and messaging. Re-skin this pattern for wedding clients — they see their timeline, gallery, invoices, and can message their photographer.

---

## Acceptance Criteria

- [ ] Client login with email-based magic link or password (limited scope — no social auth v1)
- [ ] Dashboard showing: upcoming milestones, unread messages, unpaid invoices, new gallery photos
- [ ] Timeline view (read-only, from Phase 1 timeline port)
- [ ] Gallery view (from Phase 1 gallery)
- [ ] Invoice history with pay-now button
- [ ] Simple messaging to vendor (no real-time — email-backed)

---

## Technical Notes

- Auth: Adapt MORAN passwordless invite flow + session cookies
- Portal layout: Single sidebar nav (Dashboard, Timeline, Gallery, Invoices, Messages)
- Messages: AgentMail-based for v1 (async, not real-time)
- Read-only timeline uses the same API endpoints as the vendor view but filtered