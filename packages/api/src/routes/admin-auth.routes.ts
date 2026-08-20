import { Router } from "express";
import { db } from "../db.js";
import { adminUsers, adminSessions } from "@weddingos/db";
import { eq, and, lt } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateSessionToken,
  sessionExpiry,
} from "../auth.js";
import {
  requireAdminAuth,
  type AuthenticatedAdminRequest,
} from "../middleware/admin-auth.js";

export const adminAuthRouter = Router();

// POST /api/admin/login — authenticate admin by email/password, create session
adminAuthRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "email and password are required",
        },
      });
    }

    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (!adminUser) {
      return res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
    }

    const valid = await comparePassword(password, adminUser.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
    }

    // Create admin session
    const token = generateSessionToken();
    await db.insert(adminSessions).values({
      id: token,
      adminUserId: adminUser.id,
      expiresAt: sessionExpiry(),
    });

    res.cookie("admin_session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      message: "Admin login successful",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/logout — destroy admin session
adminAuthRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.admin_session_token;
    if (token) {
      await db.delete(adminSessions).where(eq(adminSessions.id, token));
    }

    res.clearCookie("admin_session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({ message: "Admin logout successful" });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/me — return current admin info
adminAuthRouter.get(
  "/me",
  requireAdminAuth,
  (req: AuthenticatedAdminRequest, res) => {
    res.json({ admin: req.adminUser ?? null });
  },
);