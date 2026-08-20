import { Router } from "express";
import { db } from "../db.js";
import { blogPosts, blogCategories } from "@weddingos/db";
import { eq, and, like, desc, sql } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const blogRouter = Router();

// Helper: generate a slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Categories ──────────────────────────────────────────────────────────────

// GET /api/blog/categories — list all categories for vendor
blogRouter.get(
  "/categories",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const result = await db
        .select()
        .from(blogCategories)
        .where(eq(blogCategories.vendorId, vendorId))
        .orderBy(blogCategories.sortOrder, blogCategories.name);
      res.json({ categories: result });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/blog/categories — create a category
blogRouter.post(
  "/categories",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const { name } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Category name is required" },
        });
      }

      const slug = slugify(name);
      if (!slug) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid category name" },
        });
      }

      const [category] = await db
        .insert(blogCategories)
        .values({ vendorId, name: name.trim(), slug })
        .returning();

      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/blog/categories/:id — update a category
blogRouter.put(
  "/categories/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const categoryId = Number(req.params.id);

      if (isNaN(categoryId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid category ID" },
        });
      }

      const { name, sortOrder } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined && typeof name === "string" && name.trim()) {
        updateData.name = name.trim();
        updateData.slug = slugify(name.trim());
      }
      if (sortOrder !== undefined) {
        updateData.sortOrder = sortOrder;
      }

      const [updated] = await db
        .update(blogCategories)
        .set({ ...updateData, updatedAt: new Date() })
        .where(
          and(
            eq(blogCategories.id, categoryId),
            eq(blogCategories.vendorId, vendorId),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Category not found" },
        });
      }

      res.json({ category: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/blog/categories/:id — delete a category
blogRouter.delete(
  "/categories/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const categoryId = Number(req.params.id);

      if (isNaN(categoryId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid category ID" },
        });
      }

      const [deleted] = await db
        .delete(blogCategories)
        .where(
          and(
            eq(blogCategories.id, categoryId),
            eq(blogCategories.vendorId, vendorId),
          ),
        )
        .returning();

      if (!deleted) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Category not found" },
        });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

// ── Posts ──────────────────────────────────────────────────────────────────

// GET /api/blog/posts — list posts (paginated, filterable by status)
blogRouter.get(
  "/posts",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const status = req.query.status as string | undefined;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const conditions = [eq(blogPosts.vendorId, vendorId)];
      if (status) {
        conditions.push(eq(blogPosts.status, status));
      }

      const result = await db
        .select()
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(blogPosts)
        .where(and(...conditions));

      const categoryIds = result
        .map((p) => p.categoryId)
        .filter((id): id is number => id !== null);
      let categoryMap = new Map<number, (typeof blogCategories.$inferSelect)>();
      if (categoryIds.length > 0) {
        const cats = await db
          .select()
          .from(blogCategories)
          .where(
            and(
              eq(blogCategories.vendorId, vendorId),
              ...categoryIds.map((id) => eq(blogCategories.id, id)),
            ),
          );
        for (const c of cats) {
          categoryMap.set(c.id, c);
        }
      }

      const postsWithCategory = result.map((post) => ({
        ...post,
        category: post.categoryId ? categoryMap.get(post.categoryId) ?? null : null,
      }));

      res.json({
        posts: postsWithCategory,
        total: Number(count),
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/blog/posts — create a blog post
blogRouter.post(
  "/posts",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const { title, content, excerpt, featuredImage, status, categoryId, tags, seoTitle, seoDescription, publishedAt } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Title is required" },
        });
      }

      const slug = slugify(title.trim());

      const [post] = await db
        .insert(blogPosts)
        .values({
          vendorId,
          title: title.trim(),
          slug,
          content: content ?? null,
          excerpt: excerpt ?? null,
          featuredImage: featuredImage ?? null,
          status: status ?? "draft",
          categoryId: categoryId ?? null,
          tags: tags ?? [],
          seoTitle: seoTitle ?? null,
          seoDescription: seoDescription ?? null,
          publishedAt: status === "published" ? (publishedAt ? new Date(publishedAt) : new Date()) : publishedAt ? new Date(publishedAt) : null,
        })
        .returning();

      res.status(201).json({ post });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/blog/posts/:id — single post
blogRouter.get(
  "/posts/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const postId = Number(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid post ID" },
        });
      }

      const [post] = await db
        .select()
        .from(blogPosts)
        .where(
          and(eq(blogPosts.id, postId), eq(blogPosts.vendorId, vendorId)),
        )
        .limit(1);

      if (!post) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Post not found" },
        });
      }

      let category = null;
      if (post.categoryId) {
        const [cat] = await db
          .select()
          .from(blogCategories)
          .where(eq(blogCategories.id, post.categoryId))
          .limit(1);
        category = cat ?? null;
      }

      res.json({ post: { ...post, category } });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/blog/posts/:id — update a blog post
blogRouter.put(
  "/posts/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const postId = Number(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid post ID" },
        });
      }

      const { title, content, excerpt, featuredImage, status, categoryId, tags, seoTitle, seoDescription, publishedAt } = req.body;

      const updateData: Record<string, unknown> = {};
      if (title !== undefined) {
        updateData.title = title;
        updateData.slug = slugify(title);
      }
      if (content !== undefined) updateData.content = content;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
      if (status !== undefined) updateData.status = status;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (tags !== undefined) updateData.tags = tags;
      if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
      if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
      if (publishedAt !== undefined) updateData.publishedAt = new Date(publishedAt);
      if (status === "published" && !publishedAt) {
        updateData.publishedAt = new Date();
      }

      updateData.updatedAt = new Date();

      const [updated] = await db
        .update(blogPosts)
        .set(updateData)
        .where(
          and(eq(blogPosts.id, postId), eq(blogPosts.vendorId, vendorId)),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Post not found" },
        });
      }

      res.json({ post: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/blog/posts/:id — delete a blog post
blogRouter.delete(
  "/posts/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const postId = Number(req.params.id);

      if (isNaN(postId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid post ID" },
        });
      }

      const [deleted] = await db
        .delete(blogPosts)
        .where(
          and(eq(blogPosts.id, postId), eq(blogPosts.vendorId, vendorId)),
        )
        .returning();

      if (!deleted) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Post not found" },
        });
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

// ── Public blog routes ─────────────────────────────────────────────────────

// GET /api/blog/public — public list of published posts for a vendor
blogRouter.get("/public", async (req, res, next) => {
  try {
    const vendorId = Number(req.query.vendorId);
    if (isNaN(vendorId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "vendorId query parameter is required" },
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const result = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.vendorId, vendorId),
          eq(blogPosts.status, "published"),
        ),
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.vendorId, vendorId),
          eq(blogPosts.status, "published"),
        ),
      );

    // Fetch categories for the posts
    const categoryIds = result
      .map((p) => p.categoryId)
      .filter((id): id is number => id !== null);
    let categoryMap = new Map<number, (typeof blogCategories.$inferSelect)>();
    if (categoryIds.length > 0) {
      const cats = await db
        .select()
        .from(blogCategories)
        .where(
          and(
            eq(blogCategories.vendorId, vendorId),
            ...categoryIds.map((id) => eq(blogCategories.id, id)),
          ),
        );
      for (const c of cats) {
        categoryMap.set(c.id, c);
      }
    }

    const postsWithCategory = result.map((post) => ({
      ...post,
      category: post.categoryId ? categoryMap.get(post.categoryId) ?? null : null,
    }));

    res.json({
      posts: postsWithCategory,
      total: Number(count),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/blog/public/:slug — public single post by slug
blogRouter.get("/public/:slug", async (req, res, next) => {
  try {
    const vendorId = Number(req.query.vendorId);
    const slug = req.params.slug;

    if (isNaN(vendorId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "vendorId query parameter is required" },
      });
    }

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.vendorId, vendorId),
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, "published"),
        ),
      )
      .limit(1);

    if (!post) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Post not found" },
      });
    }

    let category = null;
    if (post.categoryId) {
      const [cat] = await db
        .select()
        .from(blogCategories)
        .where(eq(blogCategories.id, post.categoryId))
        .limit(1);
      category = cat ?? null;
    }

    // Get previous and next published posts
    const [prevPost] = await db
      .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.vendorId, vendorId),
          eq(blogPosts.status, "published"),
          sql`${blogPosts.publishedAt} < ${post.publishedAt}`,
        ),
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(1);

    const [nextPost] = await db
      .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.vendorId, vendorId),
          eq(blogPosts.status, "published"),
          sql`${blogPosts.publishedAt} > ${post.publishedAt}`,
        ),
      )
      .orderBy(blogPosts.publishedAt)
      .limit(1);

    res.json({
      post: { ...post, category },
      prevPost: prevPost ?? null,
      nextPost: nextPost ?? null,
    });
  } catch (error) {
    next(error);
  }
});