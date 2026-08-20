import { Router } from "express";
import { db } from "../db.js";
import { sitePages } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const sitePagesRouter = Router();

// Helper: generate a slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// All auth routes use requireAuth
sitePagesRouter.use(requireAuth);

// GET /api/site-pages — list all site pages for vendor
sitePagesRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const result = await db
      .select()
      .from(sitePages)
      .where(eq(sitePages.vendorId, vendorId))
      .orderBy(sitePages.createdAt);
    res.json({ pages: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/site-pages — create a site page
sitePagesRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { title, content, isHomepage, isPublished, seoTitle, seoDescription } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Title is required" },
      });
    }

    const slug = slugify(title.trim());
    if (!slug) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid title" },
      });
    }

    // If setting as homepage, unset any existing homepage first
    if (isHomepage) {
      await db
        .update(sitePages)
        .set({ isHomepage: false })
        .where(
          and(
            eq(sitePages.vendorId, vendorId),
            eq(sitePages.isHomepage, true),
          ),
        );
    }

    const [page] = await db
      .insert(sitePages)
      .values({
        vendorId,
        title: title.trim(),
        slug,
        content: content ?? null,
        isHomepage: isHomepage ?? false,
        isPublished: isPublished ?? false,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
      })
      .returning();

    res.status(201).json({ page });
  } catch (error) {
    next(error);
  }
});

// GET /api/site-pages/:id — single page
sitePagesRouter.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const pageId = Number(req.params.id);

    if (isNaN(pageId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid page ID" },
      });
    }

    const [page] = await db
      .select()
      .from(sitePages)
      .where(
        and(eq(sitePages.id, pageId), eq(sitePages.vendorId, vendorId)),
      )
      .limit(1);

    if (!page) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Page not found" },
      });
    }

    res.json({ page });
  } catch (error) {
    next(error);
  }
});

// PUT /api/site-pages/:id — update a site page
sitePagesRouter.put("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const pageId = Number(req.params.id);

    if (isNaN(pageId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid page ID" },
      });
    }

    const { title, content, isHomepage, isPublished, seoTitle, seoDescription } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = slugify(title);
    }
    if (content !== undefined) updateData.content = content;
    if (isHomepage !== undefined) updateData.isHomepage = isHomepage;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    updateData.updatedAt = new Date();

    // If setting as homepage, unset any existing homepage first
    if (isHomepage) {
      await db
        .update(sitePages)
        .set({ isHomepage: false })
        .where(
          and(
            eq(sitePages.vendorId, vendorId),
            eq(sitePages.isHomepage, true),
            eq(sitePages.isPublished, true),
          ),
        );
    }

    const [updated] = await db
      .update(sitePages)
      .set(updateData)
      .where(
        and(eq(sitePages.id, pageId), eq(sitePages.vendorId, vendorId)),
      )
      .returning();

    if (!updated) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Page not found" },
      });
    }

    res.json({ page: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/site-pages/:id — delete a site page
sitePagesRouter.delete("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const pageId = Number(req.params.id);

    if (isNaN(pageId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid page ID" },
      });
    }

    const [deleted] = await db
      .delete(sitePages)
      .where(
        and(eq(sitePages.id, pageId), eq(sitePages.vendorId, vendorId)),
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Page not found" },
      });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ── Public site page routes ────────────────────────────────────────────────

// GET /api/site-pages/public/:slug — single public published page
sitePagesRouter.get("/public/:slug", async (req, res, next) => {
  try {
    const vendorId = Number(req.query.vendorId);
    const slug = req.params.slug;

    if (isNaN(vendorId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "vendorId query parameter is required" },
      });
    }

    // If slug is "home", find the homepage
    let page;
    if (slug === "home") {
      [page] = await db
        .select()
        .from(sitePages)
        .where(
          and(
            eq(sitePages.vendorId, vendorId),
            eq(sitePages.isHomepage, true),
            eq(sitePages.isPublished, true),
          ),
        )
        .limit(1);
    } else {
      [page] = await db
        .select()
        .from(sitePages)
        .where(
          and(
            eq(sitePages.vendorId, vendorId),
            eq(sitePages.slug, slug),
            eq(sitePages.isPublished, true),
          ),
        )
        .limit(1);
    }

    if (!page) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Page not found" },
      });
    }

    res.json({ page });
  } catch (error) {
    next(error);
  }
});