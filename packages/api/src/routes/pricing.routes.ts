import { Router } from "express";
import { db } from "../db.js";
import { vendors } from "@weddingos/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  calculatePricing,
  type ExperienceLevel,
  formatCents,
  SERVICE_LABELS,
  SERVICE_RATES,
  ADDON_PRICES,
} from "../lib/pricing.js";
import { generatePricingExplanation, isAiConfigured } from "../lib/ai.js";

export const pricingRouter = Router();

pricingRouter.use(requireAuth);

// GET /api/pricing/services — list available services and rates for the UI
pricingRouter.get("/services", (_req: AuthenticatedRequest, res) => {
  res.json({
    services: Object.entries(SERVICE_LABELS).map(([key, label]) => ({
      key,
      label,
      baseCents: Math.round(SERVICE_RATES[key].base * 100),
      perHourCents: SERVICE_RATES[key].perHour ? SERVICE_RATES[key].perHour! * 100 : null,
      perMinuteCents: SERVICE_RATES[key].perMinute ? SERVICE_RATES[key].perMinute! * 100 : null,
    })),
    addons: Object.entries(ADDON_PRICES).map(([key, price]) => ({
      key,
      label: key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      priceCents: price * 100,
    })),
  });
});

// POST /api/pricing/recommend — generate pricing recommendation
pricingRouter.post("/recommend", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const {
      state,
      metro,
      services,
      photoHours = 0,
      videoMinutes = 0,
      addonServices = [],
      experienceLevel = "established",
      clientName = "the client",
    } = req.body ?? {};

    if (!state || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "state and services (non-empty array) are required" },
      });
    }

    const calc = calculatePricing({
      state,
      metro,
      services,
      photoHours: Number(photoHours) || 0,
      videoMinutes: Number(videoMinutes) || 0,
      addonServices,
      experienceLevel: experienceLevel as ExperienceLevel,
    });

    // Look up vendor business name for the AI explanation
    const [vendor] = await db
      .select({ businessName: vendors.businessName, name: vendors.name })
      .from(vendors)
      .where(eq(vendors.id, vendorId))
      .limit(1);

    const vendorName = vendor?.businessName ?? vendor?.name ?? "your studio";

    let explanation: string | null = null;
    if (isAiConfigured()) {
      explanation = await generatePricingExplanation({
        vendorName,
        clientName,
        regionName: calc.regionName,
        multiplier: calc.multiplier,
        services,
        lineItems: calc.lineItems,
        subtotalCents: calc.subtotalCents,
        bundleDiscountPercent: calc.bundleDiscountPercent,
        finalCents: calc.finalCents,
        experienceLevel: experienceLevel as string,
      });
    }

    res.json({
      recommendation: {
        lineItems: calc.lineItems.map((li) => ({
          ...li,
          amountDisplay: formatCents(li.amount),
        })),
        subtotalCents: calc.subtotalCents,
        subtotalDisplay: formatCents(calc.subtotalCents),
        regionName: calc.regionName,
        multiplier: calc.multiplier,
        bundleDiscountPercent: calc.bundleDiscountPercent,
        bundleDiscountCents: calc.bundleDiscountCents,
        bundleDiscountDisplay: formatCents(calc.bundleDiscountCents),
        experienceMultiplier: calc.experienceMultiplier,
        finalCents: calc.finalCents,
        finalDisplay: formatCents(calc.finalCents),
        aiConfigured: isAiConfigured(),
        explanation,
      },
    });
  } catch (error) {
    next(error);
  }
});