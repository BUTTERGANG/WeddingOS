---
status: backlog
priority: P1
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 1 — Timeline Planner Port

> **Repo:** WeddingOS
> **Description:** Port timeline CRUD with drag-reorder from WEDDINGTIMELINE repo

---

## Context

The timeline planner is the most complete feature in WEDDINGTIMELINE — drag-and-drop event reordering, time conflict detection, and shareable links. Port it to WeddingOS with multi-tenant vendor isolation.

---

## Acceptance Criteria

- [ ] Port dnd-kit timeline CRUD from WEDDINGTIMELINE with all event fields (time, duration, location, notes, assigned person)
- [ ] Add vendor_id foreign key for multi-tenant isolation
- [ ] Drag-and-drop reorder with optimistic UI updates
- [ ] Time conflict detection with visual warnings
- [ ] Shareable read-only link per vendor

---

## Technical Notes

- Source: https://github.com/BUTTERGANG/WEDDINGTIMELINE — SCRUM/Backlog/timeline_crud_with_drag_reorder.md
- Stack: React + dnd-kit + Neon/Drizzle + Express
- WEDDINGTIMELINE uses @neondatabase/serverless + drizzle-orm + postgres