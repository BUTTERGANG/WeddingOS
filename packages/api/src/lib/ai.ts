/**
 * lib/ai.ts — OpenRouter LLM integration for pricing explanations.
 *
 * Env-gated: if OPENROUTER_API_KEY is unset, functions return null
 * (features degrade gracefully, per AGENT-PLAYBOOK).
 */

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export function isAiConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export async function generatePricingExplanation(params: {
  vendorName: string;
  clientName: string;
  regionName: string;
  multiplier: number;
  services: string[];
  lineItems: { label: string; amount: number }[];
  subtotalCents: number;
  bundleDiscountPercent: number;
  finalCents: number;
  experienceLevel: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const lineItemsText = params.lineItems
    .map((li) => `- ${li.label}: $${(li.amount / 100).toFixed(2)}`)
    .join("\n");

  const prompt = `You are a pricing consultant for wedding and creative vendors. Given market data, explain a pricing recommendation to a photographer in 2-3 concise, natural sentences. Do NOT compute numbers yourself — use the numbers provided. The tone should be professional and practical.

VENDOR: ${params.vendorName}
CLIENT: ${params.clientName}
REGION: ${params.regionName} (market multiplier ${params.multiplier.toFixed(2)}x national average)
EXPERIENCE LEVEL: ${params.experienceLevel}
SERVICES:
${lineItemsText}
SUBTOTAL: $${(params.subtotalCents / 100).toFixed(2)}
BUNDLE DISCOUNT: ${params.bundleDiscountPercent}%
RECOMMENDED TOTAL: $${(params.finalCents / 100).toFixed(2)}

Write only the explanation text.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You write concise, practical pricing explanations for wedding vendors. You never invent numbers.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 250,
        temperature: 0.4,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
