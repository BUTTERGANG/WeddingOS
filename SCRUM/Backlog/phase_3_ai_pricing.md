---
status: backlog
priority: P1
agent_claimed: null
claimed_at: null
updated: 2026-08-20
---

# Phase 3 — AI Pricing Recommendations

> **Repo:** WeddingOS
> **Description:** AI-generated pricing recommendations for vendors based on market data, client profile, and service type

---

## Context

HoneyBook added AI pricing tools in 2025 — a differentiator for WeddingOS. We already have:
- 50-state pricing data from PHOTO repo (wedding_photography_cost_calculator.html + market reports)
- Regional multipliers (Midwest 0.89×, NYC 1.31×, etc.)
- Base rates per service type

Wrap this market data with an LLM (OpenRouter) to generate personalized pricing recommendations for each client inquiry.

---

## Acceptance Criteria

- [ ] Pricing recommendation endpoint: POST /api/pricing/recommend
- [ ] Input: client location (state), service type (wedding, portrait, event, etc.), hours, experience level, add-ons
- [ ] Output: recommended price range, itemized breakdown, regional adjustment, competitor comparison
- [ ] LLM generates natural-language explanation of the recommendation
- [ ] Fallback: deterministic calculation (no LLM) when OpenRouter key is unset
- [ ] Integration: "Suggest Price" button on client detail page + create invoice prefill

---

## Technical Notes

- OpenRouter API key (env: OPENROUTER_API_KEY) — use free models for cost control
- Deterministic fallback: port the PHOTO calculator's base rates + regional multipliers into lib/pricing.ts
- LLM prompt: include market data, client details, vendor positioning; request JSON output
- Never trust LLM math — LLM writes the explanation, deterministic code does the numbers