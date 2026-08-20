/**
 * lib/stripe.ts — Stripe client + checkout helpers
 *
 * Env-gated: if STRIPE_SECRET_KEY is unset, all functions are no-ops
 * that return null (features degrade gracefully, per AGENT-PLAYBOOK).
 */

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Create a Stripe Checkout Session for an invoice.
 * Returns the session (with url) or null when Stripe isn't configured.
 *
 * The client's cart/invoice is NEVER trusted for pricing — amount is
 * derived server-side from the invoice row and passed to Stripe directly.
 */
export async function createInvoiceCheckoutSession(params: {
  invoiceId: number;
  invoiceNumber: string;
  amountCents: number;
  clientEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionUrl: string; sessionId: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.clientEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: params.amountCents,
          product_data: {
            name: `Invoice ${params.invoiceNumber}`,
            description: params.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoice_id: String(params.invoiceId),
      invoice_number: params.invoiceNumber,
    },
    payment_intent_data: {
      metadata: {
        invoice_id: String(params.invoiceId),
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return { sessionUrl: session.url ?? "", sessionId: session.id };
}

/**
 * Verify a Stripe webhook signature. Returns the parsed event,
 * or throws an error when the signature is invalid.
 * Mount the webhook route with express.raw() — the raw body is required.
 */
export function verifyWebhookEvent(
  payload: Buffer | string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
