import { Router } from "express";
import { db } from "../db.js";
import { printProducts, printOrders, printOrderItems, clients } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { createInvoiceCheckoutSession, isStripeConfigured } from "../lib/stripe.js";
import { sendTransactional } from "../lib/mail.js";
import { absUrl } from "../lib/site-url.js";

export const printStoreRouter = Router();

// GET /api/print-store/products — list active products (public, no auth needed)
printStoreRouter.get("/products", async (_req, res, next) => {
  try {
    const products = await db.select().from(printProducts).where(eq(printProducts.isActive, true)).orderBy(printProducts.sortOrder);
    res.json({ products });
  } catch (error) { next(error); }
});

// Authenticated routes below
printStoreRouter.use(requireAuth);

// POST /api/print-store/orders — create an order (from gallery detail view)
printStoreRouter.post("/orders", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { clientId, galleryId, items, shippingAddress } = req.body;

    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { name: "ValidationError", message: "clientId and items array required" } });
    }

    // Verify client belongs to vendor
    const [client] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId))).limit(1);
    if (!client) return res.status(404).json({ error: { name: "NotFound", message: "Client not found" } });

    // Calculate totals
    let totalCents = 0;
    const orderItems: Array<{ productId?: number; imageId?: number; productName: string; quantity: number; unitPriceCents: number; totalCents: number; imageFilename?: string }> = [];

    for (const item of items) {
      const [product] = await db.select().from(printProducts).where(eq(printProducts.id, item.productId)).limit(1);
      if (!product) continue;
      const qty = item.quantity ?? 1;
      const itemTotal = product.priceCents * qty;
      totalCents += itemTotal;
      orderItems.push({
        productId: product.id,
        imageId: item.imageId ?? null,
        productName: product.name,
        quantity: qty,
        unitPriceCents: product.priceCents,
        totalCents: itemTotal,
        imageFilename: item.imageFilename ?? null,
      });
    }

    const shippingCents = totalCents >= 5000 ? 0 : 599; // free shipping over $50

    const [order] = await db.insert(printOrders).values({
      vendorId,
      clientId,
      galleryId: galleryId ?? null,
      status: "pending",
      totalCents,
      shippingCents,
      shippingAddress: shippingAddress ?? null,
    }).returning();

    // Insert order items with orderId
    for (const item of orderItems) {
      await db.insert(printOrderItems).values({ ...item, orderId: order.id });
    }

    // Try Stripe checkout
    if (isStripeConfigured()) {
      const session = await createInvoiceCheckoutSession({
        invoiceId: order.id,
        invoiceNumber: `PRINT-${order.id}`,
        amountCents: totalCents + shippingCents,
        clientEmail: client.email,
        description: `Print order #${order.id} (${orderItems.length} items)`,
        successUrl: absUrl("/dashboard"),
        cancelUrl: absUrl(`/clients/${clientId}/gallery`),
      });
      if (session) {
        await db.update(printOrders).set({ stripePaymentIntentId: session.sessionId }).where(eq(printOrders.id, order.id));
        return res.status(201).json({ order, checkoutUrl: session.sessionUrl });
      }
    }

    res.status(201).json({ order, message: "Order created (no payment processor)" });
  } catch (error) { next(error); }
});

// GET /api/print-store/orders — list orders for this vendor
printStoreRouter.get("/orders", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const orders = await db.select().from(printOrders).where(eq(printOrders.vendorId, vendorId)).orderBy(printOrders.createdAt);
    res.json({ orders });
  } catch (error) { next(error); }
});

// PATCH /api/print-store/orders/:id — update order status (mark fulfilled/cancelled)
printStoreRouter.patch("/orders/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(printOrders).where(and(eq(printOrders.id, orderId), eq(printOrders.vendorId, vendorId))).limit(1);
    if (!order) return res.status(404).json({ error: { name: "NotFound", message: "Order not found" } });
    const { status } = req.body;
    if (!status || !["pending", "paid", "fulfilled", "cancelled"].includes(status)) {
      return res.status(400).json({ error: { name: "ValidationError", message: "Invalid status" } });
    }
    const [updated] = await db.update(printOrders).set({ status }).where(eq(printOrders.id, orderId)).returning();
    res.json({ order: updated });
  } catch (error) { next(error); }
});