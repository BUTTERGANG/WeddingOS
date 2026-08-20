---
status: backlog
priority: P2
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 2 — Contract Builder and E-Signature

> **Repo:** WeddingOS
> **Description:** Template-based contract creation with digital signatures

---

## Context

HoneyBook and 17hats both offer contract + e-signature. WeddingOS needs the same — photographers send a contract to a client, client signs digitally, contract is stored and timestamped.

---

## Acceptance Criteria

- [ ] Contract template builder with merge fields (client name, date, price, venue)
- [ ] Send contract to client via email (AgentMail)
- [ ] Client view: read contract, sign (typed signature or drawn), date
- [ ] Signature audit trail with timestamp and IP
- [ ] Signed PDF generation with signature overlay
- [ ] Contract status tracking (draft, sent, signed, expired)

---

## Technical Notes

- PDF generation: jsPDF (already in WEDDINGTIMELINE deps) or PDFKit
- E-signature: No need for DocuSign API — typed name + IP timestamp is legally sufficient for photo contracts
- Audit trail: Store signature events with timestamps in audit_logs table (pattern from MORAN-WEBSITE)
- Template engine: Simple markdown or Handlebars-style merge fields