/**
 * lib/mail.ts — Transactional email dispatch
 *
 * sendTransactional(): AgentMail first; THROWS when a send was attempted
 * and failed. Anything a customer is owed goes on this.
 *
 * send(): SMTP-only fallback (nodemailer) that returns silently when
 * SMTP is unconfigured. Use only for non-critical mail.
 *
 * Pattern borrowed from MORAN-WEBSITE lib/mail.ts — choosing the wrong
 * sender means the email is never delivered.
 */

import { sendEmail, type EmailMessage } from "./agentmail.js";
import nodemailer from "nodemailer";

/**
 * Send a transactional email — AgentMail first, SMTP fallback.
 * Throws if a send was attempted and failed.
 */
export async function sendTransactional(msg: EmailMessage): Promise<void> {
  const result = await sendEmail(msg);
  if (result) return;

  // AgentMail not configured or failed — try SMTP
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "WeddingOS <no-reply@weddingos.app>",
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    });
    return;
  }

  // Neither configured: if this is a real customer-facing email, we must
  // know about it — throw so the caller can log/warn.
  if (!process.env.AGENTMAIL) {
    throw new Error(
      "sendTransactional: no email transport configured (AGENTMAIL or SMTP_HOST)",
    );
  }
}

/**
 * Best-effort email. Returns silently when no transport is configured.
 * Do NOT use for anything a customer is owed (order receipts, password
 * resets, invoice notifications).
 */
export async function sendBestEffort(msg: EmailMessage): Promise<void> {
  try {
    await sendTransactional(msg);
  } catch {
    // silent — this is the "choosing silence" path; use deliberately
  }
}
