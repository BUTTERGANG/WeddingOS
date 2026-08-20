import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { vendors, sessions } from "@weddingos/db";
import { eq, and, lt, gt } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  vendor?: {
    id: number;
    name: string;
    email: string;
    businessName: string | null;
    businessWebsite: string | null;
    phone: string | null;
  };
  sessionToken?: string;
}

/**
 * Middleware that verifies the session cookie and attaches the vendor to req.
 * Expects a cookie named "session_token" containing a valid session id.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.session_token;
    if (!token || typeof token !== "string") {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Authentication required" },
      });
    }

    // Look up the session, ensuring it hasn't expired
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, token),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Session expired or invalid" },
      });
    }

    // Look up the vendor
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, session.vendorId))
      .limit(1);

    if (!vendor) {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Vendor not found" },
      });
    }

    req.vendor = {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      businessName: vendor.businessName,
      businessWebsite: vendor.businessWebsite,
      phone: vendor.phone,
    };
    req.sessionToken = token;

    next();
  } catch (error) {
    next(error);
  }
}