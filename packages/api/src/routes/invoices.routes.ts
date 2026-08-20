import { Router } from "express";
import { db } from "../db.js";
import { invoices, invoiceLineItems, clients } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { createInvoiceCheckoutSession, isStripeConfigured } from "../lib/stripe.js";
import { sendTransactional } from "../lib/mail.js";
import { absUrl } from "../lib/site-url.js";
import { emailLog } from "@weddingos/db";

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

// Helper: verify client ownership
async function verifyClientOwnership(
  clientId: number,
  vendorId: number,
): Promise<boolean> {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId)))
    .limit(1);
  return !!client;
}

// Helper: verify invoice ownership
async function verifyInvoiceOwnership(invoiceId: number, vendorId: number) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.vendorId, vendorId)),
    )
    .limit(1);
  return invoice || null;
}

// Helper: get client info for an invoice
async function getClientForInvoice(invoiceId: number) {
  const [result] = await db
    .select({
      client: clients,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  return result?.client ?? null;
}

// GET /api/invoices/:clientId — list invoices for client
invoicesRouter.get("/:clientId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.clientId);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    const owns = await verifyClientOwnership(clientId, vendorId);
    if (!owns) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    const result = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.clientId, clientId), eq(invoices.vendorId, vendorId)),
      )
      .orderBy(invoices.createdAt);

    // Also fetch line items for each invoice
    const invoiceIds = result.map((inv) => inv.id);
    const allLineItems =
      invoiceIds.length > 0
        ? await db
            .select()
            .from(invoiceLineItems)
            .where(
              and(...invoiceIds.map((id) => eq(invoiceLineItems.invoiceId, id))),
            )
        : [];

    const lineItemsByInvoiceId = new Map<number, typeof allLineItems>();
    for (const item of allLineItems) {
      const existing = lineItemsByInvoiceId.get(item.invoiceId) || [];
      existing.push(item);
      lineItemsByInvoiceId.set(item.invoiceId, existing);
    }

    const invoicesWithItems = result.map((inv) => ({
      ...inv,
      lineItems: lineItemsByInvoiceId.get(inv.id) || [],
    }));

    res.json({ invoices: invoicesWithItems });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:clientId — create invoice with line items
invoicesRouter.post("/:clientId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.clientId);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    const owns = await verifyClientOwnership(clientId, vendorId);
    if (!owns) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    const { invoiceNumber, amountCents, dueDate, notes, lineItems } = req.body;

    if (!invoiceNumber || amountCents === undefined) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "invoiceNumber and amountCents are required",
        },
      });
    }

    const [invoice] = await db
      .insert(invoices)
      .values({
        vendorId,
        clientId,
        invoiceNumber,
        amountCents,
        dueDate: dueDate ?? null,
        notes: notes ?? null,
        status: "draft",
      })
      .returning();

    // Insert line items if provided
    let createdLineItems: typeof invoiceLineItems.$inferSelect[] = [];
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const values = lineItems.map((item: { description: string; quantity?: number; unitPriceCents: number; totalCents: number }) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
      }));

      createdLineItems = await db
        .insert(invoiceLineItems)
        .values(values)
        .returning();
    }

    res.status(201).json({ invoice, lineItems: createdLineItems });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/invoices/:id — update invoice
invoicesRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const invoiceId = Number(req.params.id);

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid invoice ID" },
      });
    }

    const invoice = await verifyInvoiceOwnership(invoiceId, vendorId);
    if (!invoice) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Invoice not found" },
      });
    }

    const { invoiceNumber, amountCents, dueDate, notes, status } = req.body;

    const updateData: Record<string, unknown> = {};
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber;
    if (amountCents !== undefined) updateData.amountCents = amountCents;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Fetch line items
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));

    res.json({ invoice: updated, lineItems });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:id/send — send invoice via email + create Stripe checkout
invoicesRouter.post("/:id/send", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const invoiceId = Number(req.params.id);

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid invoice ID" },
      });
    }

    const invoice = await verifyInvoiceOwnership(invoiceId, vendorId);
    if (!invoice) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Invoice not found" },
      });
    }

    const client = await getClientForInvoice(invoiceId);
    if (!client) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    // Mark as sent first
    const [updated] = await db
      .update(invoices)
      .set({ status: "sent" })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Send email notification to client
    const amountDollars = (invoice.amountCents / 100).toFixed(2);
    const paymentLink = isStripeConfigured()
      ? absUrl(`/api/invoices/${invoiceId}/pay`)
      : null;

    try {
      await sendTransactional({
        to: client.email,
        subject: `Invoice ${invoice.invoiceNumber} from WeddingOS`,
        text: `Hello ${client.name},\n\nYou have a new invoice from your wedding vendor.\n\nInvoice: ${invoice.invoiceNumber}\nAmount: $${amountDollars}\nDue: ${invoice.dueDate ?? "N/A"}\n${paymentLink ? `\nPay online: ${paymentLink}\n` : ""}\n\nThank you!`,
      });

      // Log the email (best-effort — never block invoice send on log write)
      await db.insert(emailLog).values({
        vendorId: vendorId,
        toAddress: client.email,
        subject: `Invoice ${invoice.invoiceNumber}`,
        provider: "agentmail",
        status: "sent",
      } as any).catch(() => {});
    } catch {
      // Email send failed — invoice is still marked as sent
    }

    res.json({ invoice: updated, message: "Invoice sent to client" });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices/:id/pay — create Stripe Checkout Session for payment
invoicesRouter.post("/:id/pay", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const invoiceId = Number(req.params.id);

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid invoice ID" },
      });
    }

    const invoice = await verifyInvoiceOwnership(invoiceId, vendorId);
    if (!invoice) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Invoice not found" },
      });
    }

    const client = await getClientForInvoice(invoiceId);
    if (!client) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    // Try Stripe checkout
    if (isStripeConfigured()) {
      const session = await createInvoiceCheckoutSession({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountCents: invoice.amountCents,
        clientEmail: client.email,
        description: `Invoice ${invoice.invoiceNumber}${invoice.notes ? ` — ${invoice.notes}` : ""}`,
        successUrl: absUrl("/dashboard"),
        cancelUrl: absUrl(`/clients/${invoice.clientId}/invoices`),
      });

      if (session) {
        return res.json({
          checkoutUrl: session.sessionUrl,
          sessionId: session.sessionId,
          message: "Stripe checkout session created",
        });
      }
    }

    // Fallback: mark as paid directly (no Stripe configured)
    const [updated] = await db
      .update(invoices)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(invoices.id, invoiceId))
      .returning();

    res.json({ invoice: updated, message: "Invoice marked as paid (no payment processor)" });
  } catch (error) {
    next(error);
  }
});