import type { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { adminUsers, adminSessions } from "@weddingos/db";
import { eq, and, gt } from "drizzle-orm";

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  adminSessionToken?: string;
}

/**
 * Middleware that verifies the admin session cookie and attaches the admin user to req.
 * Expects a cookie named "admin_session_token" containing a valid session id.
 */
export async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.admin_session_token;
    if (!token || typeof token !== "string") {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Admin authentication required" },
      });
    }

    // Look up the admin session, ensuring it hasn't expired
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.id, token),
          gt(adminSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Admin session expired or invalid" },
      });
    }

    // Look up the admin user
    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, session.adminUserId))
      .limit(1);

    if (!adminUser) {
      return res.status(401).json({
        error: { name: "Unauthorized", message: "Admin user not found" },
      });
    }

    req.adminUser = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role ?? "admin",
    };
    req.adminSessionToken = token;

    next();
  } catch (error) {
    next(error);
  }
}