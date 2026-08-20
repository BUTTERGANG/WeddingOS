import { Router } from "express";
import { db } from "../db.js";
import { printProducts } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const printProductsRouter = Router();
printProductsRouter.use(requireAuth);

// GET /api/print-products — list all products for this vendor
printProductsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const products = await db
      .select()
      .from(printProducts)
      .where(eq(printProducts.vendorId, vendorId))
      .orderBy(printProducts.sortOrder);
    res.json({ products });
  } catch (error) { next(error); }
});

// POST /api/print-products — create a product
printProductsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { name, description, category, priceCents, isActive, sortOrder } = req.body;
    if (!name || priceCents === undefined) {
      return res.status(400).json({ error: { name: "ValidationError", message: "name and priceCents are required" } });
    }
    const [product] = await db.insert(printProducts).values({ vendorId, name, description, category: category ?? "print", priceCents, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 }).returning();
    res.status(201).json({ product });
  } catch (error) { next(error); }
});

// PATCH /api/print-products/:id — update a product
printProductsRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const productId = Number(req.params.id);
    const [existing] = await db.select().from(printProducts).where(and(eq(printProducts.id, productId), eq(printProducts.vendorId, vendorId))).limit(1);
    if (!existing) return res.status(404).json({ error: { name: "NotFound", message: "Product not found" } });
    const { name, description, category, priceCents, isActive, sortOrder } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (priceCents !== undefined) update.priceCents = priceCents;
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    const [updated] = await db.update(printProducts).set(update).where(eq(printProducts.id, productId)).returning();
    res.json({ product: updated });
  } catch (error) { next(error); }
});

// DELETE /api/print-products/:id
printProductsRouter.delete("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const productId = Number(req.params.id);
    await db.delete(printProducts).where(and(eq(printProducts.id, productId), eq(printProducts.vendorId, vendorId)));
    res.json({ message: "Product deleted" });
  } catch (error) { next(error); }
});