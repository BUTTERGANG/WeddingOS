---
status: backlog
priority: P2
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 2 — Calendar Booking

> **Repo:** WeddingOS
> **Description:** Public calendar embed for client booking and availability management

---

## Context

Calendly replacement — photographers set their availability, clients book consultations or sessions from an embeddable calendar widget.

---

## Acceptance Criteria

- [ ] Availability configuration (hours per day, buffer between bookings, blackout dates)
- [ ] Public booking link with embeddable iframe/widget
- [ ] Client booking flow: select service → pick date/time → enter details → confirm
- [ ] Email confirmation to both vendor and client (AgentMail)
- [ ] Calendar sync (Google Calendar / iCal export — Phase 3 if complex)

---

## Technical Notes

- react-day-picker already in stack (WEDDINGTIMELINE deps) for the UI
- Time slot calculation: 30-min increments, configurable duration per service type
- iCal/Google Calendar sync is complex — defer to Phase 3, include .ics file download in v1
- Cancellation policy: configurable hours-before cutoff per vendor