/**
 * lib/pricing.ts — Pricing calculation engine for photography/videography services.
 *
 * Ported from PHOTO repo's wedding_photography_cost_calculator.html (50-state market data).
 * Deterministic — no LLM dependency. Used as fallback when OpenRouter is unconfigured,
 * and as the numeric core even when LLM is used (LLM writes explanations, not numbers).
 */

// ── State/regional multipliers ─────────────────────────────────────────────
export const STATE_MULTIPLIERS: Record<string, number> = {
  ny: 1.31, ma: 1.24, pa: 1.0, ct: 1.15, nj: 1.2,
  "ca-sf": 1.28, "ca-la": 1.23, ca: 1.15, wa: 1.17, or: 1.08,
  il: 1.0, mn: 0.98, oh: 0.93, mi: 0.93, in: 0.89, wi: 0.93, mo: 0.93, ks: 0.88, ne: 0.88, ia: 0.88,
  "fl-miami": 1.1, fl: 0.95, "tx-austin": 1.05, tx: 0.95, ga: 1.0, nc: 0.98, sc: 0.95, tn: 0.95, va: 0.98, la: 0.85, al: 0.85,
  co: 1.05, ut: 0.98, wy: 1.15, mt: 0.95, id: 0.93,
  az: 1.0, nv: 0.95, nm: 0.88,
};

export function getMultiplier(state: string, metro?: string): number {
  if (metro) {
    const metroKey = `${state.toLowerCase()}-${metro.toLowerCase().replace(/\s+/g, "").substring(0, 6)}`;
    if (STATE_MULTIPLIERS[metroKey]) return STATE_MULTIPLIERS[metroKey];
  }
  return STATE_MULTIPLIERS[state.toLowerCase()] ?? 1.0;
}

export const STATE_NAMES: Record<string, string> = {
  ny: "New York", ma: "Massachusetts", pa: "Pennsylvania", ct: "Connecticut", nj: "New Jersey",
  "ca-sf": "San Francisco", "ca-la": "Los Angeles", ca: "California", wa: "Washington", or: "Oregon",
  il: "Illinois", mn: "Minnesota", oh: "Ohio", mi: "Michigan", in: "Indiana", wi: "Wisconsin",
  mo: "Missouri", ks: "Kansas", ne: "Nebraska", ia: "Iowa",
  fl: "Florida", tx: "Texas", ga: "Georgia", nc: "North Carolina", sc: "South Carolina",
  tn: "Tennessee", va: "Virginia", la: "Louisiana", al: "Alabama",
  co: "Colorado", ut: "Utah", wy: "Wyoming", mt: "Montana", id: "Idaho",
  az: "Arizona", nv: "Nevada", nm: "New Mexico",
};

export interface ServiceRate {
  base: number;
  perHour?: number;
  perMinute?: number;
}

export const SERVICE_RATES: Record<string, ServiceRate> = {
  "wedding-photo": { base: 5800, perHour: 600 },
  "corporate-photo": { base: 0, perHour: 400 },
  headshots: { base: 500, perHour: 160 },
  "real-estate-photo": { base: 230, perHour: 150 },
  "event-photo": { base: 1300, perHour: 400 },
  "product-photo": { base: 0, perHour: 350 },
  architectural: { base: 2500, perHour: 500 },
  "wedding-video": { base: 3500, perMinute: 200 },
  "corporate-video": { base: 2000, perMinute: 500 },
  "social-media-video": { base: 1500, perMinute: 800 },
  "event-video": { base: 1500, perMinute: 300 },
  "training-video": { base: 1000, perMinute: 1000 },
  "testimonial-video": { base: 2000, perMinute: 400 },
  animation: { base: 3000, perMinute: 5000 },
  drone: { base: 200, perMinute: 150 },
};

export const SERVICE_LABELS: Record<string, string> = {
  "wedding-photo": "Wedding Photography",
  "corporate-photo": "Corporate Photography",
  headshots: "Business Headshots",
  "real-estate-photo": "Real Estate Photography",
  "event-photo": "Event Photography",
  "product-photo": "Product Photography",
  architectural: "Architectural Photography",
  "wedding-video": "Wedding Videography",
  "corporate-video": "Corporate Video",
  "social-media-video": "Social Media Video",
  "event-video": "Event Videography",
  "training-video": "Training Video",
  "testimonial-video": "Testimonial Video",
  animation: "Animation / Motion Graphics",
  drone: "Drone / Aerial",
};

export const ADDON_PRICES: Record<string, number> = {
  "rush-delivery": 500,
  "commercial-rights": 1500,
  "virtual-tour": 250,
  retainer: 3500,
};

export const PHOTO_SERVICES = [
  "wedding-photo", "corporate-photo", "headshots", "real-estate-photo",
  "event-photo", "product-photo", "architectural",
];

export const VIDEO_SERVICES = [
  "wedding-video", "corporate-video", "social-media-video", "event-video",
  "training-video", "testimonial-video", "animation", "drone",
];

export interface PricingLineItem {
  label: string;
  amount: number;
}

export interface PricingResult {
  lineItems: PricingLineItem[];
  subtotalCents: number;
  multiplier: number;
  regionName: string;
  bundleDiscountPercent: number;
  bundleDiscountCents: number;
  experienceMultiplier: number;
  finalCents: number;
}

export type ExperienceLevel = "new" | "established" | "premium";

export function calculatePricing(params: {
  state: string;
  metro?: string;
  services: string[];
  photoHours: number;
  videoMinutes: number;
  addonServices: string[];
  experienceLevel: ExperienceLevel;
}): PricingResult {
  const multiplier = getMultiplier(params.state, params.metro);
  const regionName = STATE_NAMES[params.state] ?? params.state.toUpperCase();

  const lineItems: PricingLineItem[] = [];
  let subtotalDollars = 0;

  // Photography services (base rates are in dollars)
  PHOTO_SERVICES.forEach((service) => {
    if (params.services.includes(service)) {
      const rate = SERVICE_RATES[service];
      let price = rate.base;
      if (rate.perHour && params.photoHours > 0) {
        price += rate.perHour * params.photoHours;
      }
      price = Math.round(price * multiplier);
      subtotalDollars += price;
      lineItems.push({ label: SERVICE_LABELS[service] ?? service, amount: price });
    }
  });

  // Videography services
  VIDEO_SERVICES.forEach((service) => {
    if (params.services.includes(service)) {
      const rate = SERVICE_RATES[service];
      let price = rate.base;
      if (rate.perMinute && params.videoMinutes > 0) {
        price += rate.perMinute * params.videoMinutes;
      }
      price = Math.round(price * multiplier);
      subtotalDollars += price;
      lineItems.push({ label: SERVICE_LABELS[service] ?? service, amount: price });
    }
  });

  // Add-ons
  (params.addonServices ?? []).forEach((addon) => {
    const price = Math.round((ADDON_PRICES[addon] ?? 0) * multiplier);
    if (price > 0) {
      subtotalDollars += price;
      lineItems.push({
        label: addon.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        amount: price,
      });
    }
  });

  // Bundle discount
  const hasPhoto = params.services.some((s) => PHOTO_SERVICES.includes(s));
  const hasVideo = params.services.some((s) => VIDEO_SERVICES.includes(s));
  const bundleDiscountPercent = hasPhoto && hasVideo ? 15 : 0;
  const bundleDiscountDollars = subtotalDollars * bundleDiscountPercent / 100;

  // Experience level multiplier
  const experienceMultiplier =
    params.experienceLevel === "new" ? 0.8 :
    params.experienceLevel === "premium" ? 1.5 : 1.0;

  const afterBundle = subtotalDollars - bundleDiscountDollars;
  const finalDollars = afterBundle * experienceMultiplier;

  // Convert to cents (base rates are in dollars, API returns cents for Stripe)
  const subtotalCents = Math.round(subtotalDollars * 100);
  const bundleDiscountCents = Math.round(bundleDiscountDollars * 100);
  const finalCents = Math.round(finalDollars * 100);

  return {
    lineItems: lineItems.map((li) => ({ ...li, amount: Math.round(li.amount * 100) })),
    subtotalCents,
    multiplier,
    regionName,
    bundleDiscountPercent,
    bundleDiscountCents,
    experienceMultiplier,
    finalCents,
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}