import { useState, useEffect, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";

interface PricingService {
  id: string | number;
  name: string;
  category: string;
  rateCents?: number;
  defaultRateCents?: number;
  description?: string;
}

interface PricingLineItem {
  description: string;
  amountCents: number;
}

interface PricingRecommendation {
  lineItems: PricingLineItem[];
  regionalMultiplier: number;
  bundleDiscountCents: number;
  experienceAdjustment:
    | string
    | number
    | { label?: string; amountCents?: number };
  totalCents: number;
  aiExplanation?: string | null;
}

interface ExperienceLevelOption {
  value: "New" | "Established" | "Premium";
  label: string;
  hint: string;
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

const EXPERIENCE_LEVELS: ExperienceLevelOption[] = [
  { value: "New", label: "New", hint: "Building portfolio, competitive pricing" },
  { value: "Established", label: "Established", hint: "Proven track record, standard rates" },
  { value: "Premium", label: "Premium", hint: "Luxury brand, premium rates" },
];

const SERVICE_CATEGORIES = ["Photography", "Videography"];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function experienceAdjustmentLabel(
  adjustment: PricingRecommendation["experienceAdjustment"]
): string {
  if (typeof adjustment === "string") return adjustment;
  if (typeof adjustment === "number") return formatCurrency(adjustment);
  return adjustment?.label ?? "";
}

function experienceAdjustmentCents(
  adjustment: PricingRecommendation["experienceAdjustment"]
): number | null {
  if (typeof adjustment === "number") return adjustment;
  if (typeof adjustment === "object" && adjustment !== null) {
    return adjustment.amountCents ?? null;
  }
  return null;
}

export default function PricingPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [services, setServices] = useState<PricingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [state, setState] = useState("");
  const [metro, setMetro] = useState("");
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [photoHours, setPhotoHours] = useState(8);
  const [videoMinutes, setVideoMinutes] = useState(120);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevelOption["value"]>("Established");
  const [selectedAddOns, setSelectedAddOns] = useState<(string | number)[]>([]);
  const [clientName, setClientName] = useState("");

  // Results state
  const [recommendation, setRecommendation] =
    useState<PricingRecommendation | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceCreating, setInvoiceCreating] = useState(false);

  useEffect(() => {
    const id = parseInt(clientId);
    if (isNaN(id)) return;

    api<Client>(`/clients/${id}`)
      .then((data) => {
        setClient(data);
        setClientName(data.name);
      })
      .catch(() => toast.error("Failed to load client"));

    api<PricingService[] | { services: PricingService[] }>("/pricing/services")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.services ?? [];
        setServices(list);
        // Default: select photography if available
        const photoService = list.find(
          (s) => s.category?.toLowerCase() === "photography"
        );
        if (photoService && selectedServiceTypes.length === 0) {
          setSelectedServiceTypes([String(photoService.id)]);
        }
      })
      .catch(() => toast.error("Failed to load services"))
      .finally(() => setServicesLoading(false));
  }, [clientId]);

  const photographyServices = services.filter(
    (s) => s.category?.toLowerCase() === "photography"
  );
  const videographyServices = services.filter(
    (s) => s.category?.toLowerCase() === "videography"
  );
  const addOnServices = services.filter((s) => {
    const cat = s.category?.toLowerCase();
    return cat !== "photography" && cat !== "videography";
  });

  const toggleServiceType = (id: string | number) => {
    const key = String(id);
    setSelectedServiceTypes((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : [...prev, key]
    );
  };

  const toggleAddOn = (id: string | number) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleRecommend = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setRecommendError(null);
    setRecommendation(null);

    const id = parseInt(clientId);
    if (isNaN(id)) {
      setRecommendError("Invalid client");
      setSubmitting(false);
      return;
    }

    try {
      const result = await api<PricingRecommendation>("/pricing/recommend", {
        method: "POST",
        body: {
          clientId: id,
          state,
          metro: metro.trim() || null,
          serviceTypes: selectedServiceTypes,
          photoHours,
          videoMinutes,
          experienceLevel,
          addOns: selectedAddOns,
          clientName: clientName.trim() || null,
        },
      });
      setRecommendation(result);
      toast.success("Pricing recommendation ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get recommendation";
      setRecommendError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!recommendation) return;

    const id = parseInt(clientId);
    if (isNaN(id)) {
      toast.error("Invalid client");
      return;
    }

    setInvoiceCreating(true);
    try {
      const totalCents = recommendation.totalCents;
      const lineItems = recommendation.lineItems.map((item) => ({
        description: item.description,
        quantity: 1,
        unitPriceCents: item.amountCents,
        totalCents: item.amountCents,
      }));

      await api(`/clients/${id}/invoices`, {
        method: "POST",
        body: {
          clientId: id,
          amountCents: totalCents,
          dueDate: invoiceDueDate || null,
          lineItems,
        },
      });
      toast.success("Invoice created from quote");
      setShowInvoiceModal(false);
      setInvoiceDueDate("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    } finally {
      setInvoiceCreating(false);
    }
  };

  const itemizedTotal = recommendation
    ? recommendation.lineItems.reduce((sum, i) => sum + i.amountCents, 0)
    : 0;
  const experienceCents = recommendation
    ? experienceAdjustmentCents(recommendation.experienceAdjustment)
    : null;
  const hasBundleDiscount = recommendation
    ? recommendation.bundleDiscountCents > 0
    : false;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/clients/${clientId}`}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Client
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-400">Pricing</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            AI Pricing Recommendations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {client
              ? `Build a market-informed quote for ${client.name}`
              : "Build a market-informed quote for this client"}
          </p>
        </div>
      </div>

      {servicesLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quote form */}
          <form
            onSubmit={handleRecommend}
            className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
          >
            <h2 className="font-semibold text-gray-900">Quote Details</h2>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metro Area{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={metro}
                  onChange={(e) => setMetro(e.target.value)}
                  placeholder="e.g. Chicago"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Service types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <div className="space-y-3">
                {SERVICE_CATEGORIES.map((category) => {
                  const catServices = services.filter(
                    (s) => s.category?.toLowerCase() === category.toLowerCase()
                  );
                  if (catServices.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                        {category}
                      </p>
                      <div className="space-y-1.5">
                        {catServices.map((service) => {
                          const key = String(service.id);
                          const checked = selectedServiceTypes.includes(key);
                          return (
                            <label
                              key={key}
                              className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleServiceType(service.id)}
                                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                              />
                              <span className="flex-1 text-sm text-gray-700">
                                {service.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                {service.rateCents ?? service.defaultRateCents
                                  ? formatCurrency(
                                      service.rateCents ??
                                        service.defaultRateCents ??
                                        0
                                    )
                                  : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coverage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo Hours: <span className="text-brand-600">{photoHours}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={photoHours}
                  onChange={(e) => setPhotoHours(parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>2</span>
                  <span>12</span>
                </div>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={photoHours}
                  onChange={(e) =>
                    setPhotoHours(
                      Math.min(12, Math.max(2, parseInt(e.target.value) || 2))
                    )
                  }
                  className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video Minutes:{" "}
                  <span className="text-brand-600">{videoMinutes}</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={30}
                  value={videoMinutes}
                  onChange={(e) => setVideoMinutes(parseInt(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>30</span>
                  <span>600</span>
                </div>
                <input
                  type="number"
                  min={30}
                  max={600}
                  step={30}
                  value={videoMinutes}
                  onChange={(e) =>
                    setVideoMinutes(
                      Math.min(
                        600,
                        Math.max(30, parseInt(e.target.value) || 30)
                      )
                    )
                  }
                  className="mt-1 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Experience level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setExperienceLevel(level.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      experienceLevel === level.value
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {level.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{level.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-ons */}
            {addOnServices.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add-ons
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {addOnServices.map((service) => {
                    const checked = selectedAddOns.includes(service.id);
                    return (
                      <label
                        key={String(service.id)}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddOn(service.id)}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                        <span className="flex-1 text-sm text-gray-700">
                          {service.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {service.rateCents ?? service.defaultRateCents
                            ? formatCurrency(
                                service.rateCents ?? service.defaultRateCents ?? 0
                              )
                            : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name for the quote"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                !state ||
                selectedServiceTypes.length === 0
              }
              className="w-full py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Calculating..." : "Get Pricing Recommendation"}
            </button>
          </form>

          {/* Results */}
          <div className="space-y-4">
            {recommendError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {recommendError}
              </div>
            )}

            {!recommendation ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center py-16">
                <svg
                  className="w-12 h-12 text-gray-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500 text-sm">
                  Fill out the quote details and get an AI-powered pricing
                  recommendation.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    Recommended Quote
                  </h2>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
                    {experienceLevel} tier
                  </span>
                </div>

                {/* Itemized breakdown */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Itemized Breakdown
                  </h3>
                  <div className="space-y-2">
                    {recommendation.lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">{item.description}</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 mt-2">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(itemizedTotal)}
                    </span>
                  </div>
                </div>

                {/* Regional multiplier */}
                <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">Regional multiplier</span>
                  <span className="font-medium text-gray-900">
                    {(recommendation.regionalMultiplier * 100).toFixed(1)}%
                    {recommendation.regionalMultiplier !== 1 &&
                      ` (${recommendation.regionalMultiplier > 1 ? "+" : ""}${formatCurrency(
                        itemizedTotal *
                          (recommendation.regionalMultiplier - 1)
                      )})`}
                  </span>
                </div>

                {/* Bundle discount */}
                {hasBundleDiscount && (
                  <div className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-green-700">Bundle discount</span>
                    <span className="font-medium text-green-700">
                      −{formatCurrency(recommendation.bundleDiscountCents)}
                    </span>
                  </div>
                )}
                {!hasBundleDiscount && recommendation.bundleDiscountCents === 0 && (
                  <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-600">Bundle discount</span>
                    <span className="text-gray-400">None applied</span>
                  </div>
                )}

                {/* Experience adjustment */}
                <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">Experience level adjustment</span>
                  <span className="font-medium text-gray-900">
                    {experienceCents !== null
                      ? `${experienceCents >= 0 ? "+" : "−"}${formatCurrency(
                          Math.abs(experienceCents)
                        )}`
                      : experienceAdjustmentLabel(
                          recommendation.experienceAdjustment
                        )}
                  </span>
                </div>

                {/* Total */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Estimated Total
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {formatCurrency(recommendation.totalCents)}
                  </p>
                </div>

                {/* AI explanation */}
                {recommendation.aiExplanation && (
                  <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
                    <p className="text-xs font-medium text-brand-700 uppercase tracking-wide mb-1.5">
                      AI Reasoning
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {recommendation.aiExplanation}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Create Invoice from Quote
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create invoice modal (pre-filled with recommended amount) */}
      {showInvoiceModal && recommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Invoice from Quote
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Amount (pre-filled from quote)
                </label>
                <input
                  type="text"
                  value={formatCurrency(recommendation.totalCents)}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Line items from the recommendation will be added automatically.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invoiceCreating}
                  className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {invoiceCreating
                    ? "Creating..."
                    : `Create Invoice (${formatCurrency(
                        recommendation.totalCents
                      )})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
