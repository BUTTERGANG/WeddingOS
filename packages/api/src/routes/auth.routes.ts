import { Router } from "express";
import { db } from "../db.js";
import { vendors, sessions } from "@weddingos/db";
import { eq, and, lt } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateSessionToken,
  sessionExpiry,
} from "../auth.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const authRouter = Router();

// POST /api/auth/register — create vendor account + start session
authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "name, email, and password are required",
        },
      });
    }

    // Check for existing vendor by email
    const [existing] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.email, email))
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: {
          name: "Conflict",
          message: "An account with that email already exists",
        },
      });
    }

    const passwordHash = await hashPassword(password);

    const [vendor] = await db
      .insert(vendors)
      .values({ name, email, passwordHash })
      .returning();

    // Create session
    const token = generateSessionToken();
    await db.insert(sessions).values({
      id: token,
      vendorId: vendor.id,
      expiresAt: sessionExpiry(),
    });

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
    });

    res.status(201).json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
      },
      message: "Registration successful",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login — authenticate vendor + create session
authRouter.post("/login", async (req, res, next) => {
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

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.email, email))
      .limit(1);

    if (!vendor) {
      return res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
    }

    const valid = await comparePassword(password, vendor.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
    }

    // Create session
    const token = generateSessionToken();
    await db.insert(sessions).values({
      id: token,
      vendorId: vendor.id,
      expiresAt: sessionExpiry(),
    });

    res.cookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
      },
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout — destroy session
authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      await db.delete(sessions).where(eq(sessions.id, token));
    }

    res.clearCookie("session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({ message: "Logout successful" });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me — return current vendor info from session
authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ vendor: req.vendor ?? null });
});