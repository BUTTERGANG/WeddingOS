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

## What We Already Have (Reusable Assets)

| Module | Source Repo | Status |
|--------|-------------|--------|
| Timeline builder + guest management | WEDDINGTIMELINE | Core built, needs multi-tenant |
| Email delivery + 2FA + transactional | MORAN-WEBSITE | Production-tested (AgentMail, SMTP fallback) |
| Stripe payments + webhooks | MORAN-WEBSITE | Production-tested (checkout, refunds, tax, shipping) |
| Media gallery + lightbox + video | LA-MEDIA-WEBSITE | Built, needs client auth + proofing |
| Pricing calculator (50-state) | PHOTO | Standalone HTML, needs integration |
| Market research ($16.2B industry data) | PHOTO | Complete |
| Print store (Printify sync) | MORAN-WEBSITE | Production-tested, needs photo-lab adapter |
| Auth (session, roles, 2FA, passwordless) | MORAN-WEBSITE | Production-tested |
| Vendor/contact database | PHOTO | Research data, needs app integration |

---

## Roadmap

### Phase 1 — MVP (6-8 weeks)
Single-tenant, single vendor manages their studio through WeddingOS.

- [ ] Timeline planner (port from WEDDINGTIMELINE)
- [ ] Client gallery with password-protected proofing
- [ ] Email transactions (AgentMail)
- [ ] Invoicing + payments (Stripe)
- [ ] Client portal (adapt MORAN athlete portal)
- [ ] Pricing calculator tool

### Phase 2 — Revenue Features (Weeks 9-12)
- [x] Contract builder + e-signature
- [x] Calendar booking (public embed for clients)
- [x] Print store (photo lab API — Mpix/WHCC)
- [ ] Blog/SEO website pages

### Phase 3 — Moats (Weeks 13-16)
- [x] AI pricing recommendations
- [ ] Multi-tenant architecture
- [ ] Multi-vendor workflows
- [ ] Vendor finder/marketplace

---

## SCRUM Board

Feature work is tracked in `SCRUM/`. See `templates/scrum_reference.md` in AGENT-PLAYBOOK for the claiming protocol.

---

## Reference

Before building, read the [AGENT-PLAYBOOK](https://github.com/BUTTERGANG/AGENT-PLAYBOOK) for the full 5-phase development checklist, reference docs, and lessons-learned log.
