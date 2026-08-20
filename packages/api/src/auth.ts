import bcrypt from "bcrypt";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically random session token (hex-encoded).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/**
 * Generate a session expiry date (default: 30 days from now).
 */
export function sessionExpiry(days = 30): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}