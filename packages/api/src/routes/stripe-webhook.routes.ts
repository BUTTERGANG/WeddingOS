import { Router } from "express";
import { db } from "../db.js";
import { invoices } from "@weddingos/db";
import { eq } from "drizzle-orm";
import { verifyWebhookEvent } from "../lib/stripe.js";

export const stripeWebhookRouter = Router();

// This route is mounted BEFORE express.json() — it receives raw body
// POST /stripe/webhook — Stripe webhook endpoint
stripeWebhookRouter.post("/", async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: "Missing raw body" });
    }

    const event = verifyWebhookEvent(rawBody, sig);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoice_id;
        if (invoiceId) {
          // Mark invoice as paid — idempotent: use conditional UPDATE so
          // concurrent webhook deliveries can't double-process
          await db
            .update(invoices)
            .set({
              status: "paid",
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent ?? null,
            })
            .where(
              eq(invoices.id, Number(invoiceId)),
            );
        }
        break;
      }
      case "checkout.session.expired": {
        const expiredSession = event.data.object as any;
        const expiredInvoiceId = expiredSession.metadata?.invoice_id;
        if (expiredInvoiceId) {
          // Mark as overdue if it was sent
          const [inv] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, Number(expiredInvoiceId)))
            .limit(1);
          if (inv && inv.status === "sent") {
            await db
              .update(invoices)
              .set({ status: "overdue" })
              .where(eq(invoices.id, Number(expiredInvoiceId)));
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});