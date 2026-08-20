/**
 * lib/agentmail.ts — AgentMail email delivery
 *
 * Env-gated: if AGENTMAIL is unset, all functions are no-ops that return
 * null (features degrade gracefully, per AGENT-PLAYBOOK).
 *
 * Pattern borrowed from MORAN-WEBSITE lib/agentmail.ts:
 * - Reuses the account's existing inbox (creates one with a fixed clientId
 *   only if none exists)
 * - Renders message bodies as plain text
 */

const AGENTMAIL_API = "https://api.agentmail.to/v1";
const INBOX_CLIENT_ID = "weddingos";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface AgentMailResult {
  messageId: string;
  inboxId: string;
}

async function agentmailFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const apiKey = process.env.AGENTMAIL;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AGENTMAIL not configured" }), {
      status: 503,
    });
  }
  return fetch(`${AGENTMAIL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Ensure an inbox exists for WeddingOS. Reuses an existing inbox with the
 * fixed clientId if one exists, otherwise creates it.
 */
export async function ensureInbox(): Promise<string | null> {
  const apiKey = process.env.AGENTMAIL;
  if (!apiKey) return null;

  // Try to find existing inbox
  const listRes = await agentmailFetch("/inboxes");
  if (listRes.ok) {
    const data = (await listRes.json()) as {
      inboxes?: { id: string; client_id?: string | null }[];
    };
    const existing = data.inboxes?.find(
      (i) => i.client_id === INBOX_CLIENT_ID,
    );
    if (existing) return existing.id;
  }

  // Create one
  const createRes = await agentmailFetch("/inboxes", {
    method: "POST",
    body: JSON.stringify({ client_id: INBOX_CLIENT_ID }),
  });
  if (!createRes.ok) return null;

  const created = (await createRes.json()) as { id?: string };
  return created.id ?? null;
}

/**
 * Send an email through AgentMail. Returns message metadata, or null when
 * AgentMail isn't configured or the send failed.
 */
export async function sendEmail(msg: EmailMessage): Promise<AgentMailResult | null> {
  const apiKey = process.env.AGENTMAIL;
  if (!apiKey) return null;

  const inboxId = await ensureInbox();
  if (!inboxId) return null;

  const res = await agentmailFetch(`/inboxes/${inboxId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { id?: string };
  return { messageId: data.id ?? "", inboxId };
}
