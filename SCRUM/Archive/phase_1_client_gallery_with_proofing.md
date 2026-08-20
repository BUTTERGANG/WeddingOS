---
status: backlog
priority: P1
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 1 — Client Gallery with Proofing

> **Repo:** WeddingOS
> **Description:** Password-protected client galleries with photo selection, download, and proofing workflow

---

## Context

Pixieset's core feature — photographers upload photos, clients get a password-protected gallery link, can select favorites, download, and order prints. LA-MEDIA-WEBSITE has a grid gallery with lightbox but no client auth or proofing.

---

## Acceptance Criteria

- [ ] Photo upload with drag-and-drop and progress indicator (S3/R2 storage)
- [ ] Password-protected gallery per client with shareable link
- [ ] Client view: grid gallery, lightbox, favorites selection, download
- [ ] Photographer view: upload management, gallery settings, client activity log
- [ ] Email notification to client when gallery is ready

---

## Technical Notes

- Storage: Cloudflare R2 or AWS S3 for raw images
- Auth: Adapt MORAN session-based auth for client-facing login (limited scope)
- Gallery: Adapt LA-MEDIA-WEBSITE grid + PhotoSwipe lightbox
- Consider image optimization pipeline (sharp for thumbnails, WebP conversion)