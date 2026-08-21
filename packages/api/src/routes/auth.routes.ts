import { Router } from "express";
import rateLimit from "express-rate-limit";
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
import { asyncHandler } from "../middleware/async-handler.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

export const authRouter = Router();

// ── Auth-specific rate limits ──────────────────────────────────
// Stricter: 10 attempts per 15 min per IP on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { name: "TooManyRequests", message: "Too many login attempts. Please try again later." } },
});

authRouter.use(authLimiter);

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/register — create vendor account + start session
authRouter.post("/register", validate({ body: registerSchema }), asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check for existing vendor by email
    const [existing] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.email, email))
      .limit(1);

    if (existing) {
      res.status(409).json({
        error: {
          name: "Conflict",
          message: "An account with that email already exists",
        },
      });
      return;
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
  }));

// POST /api/auth/login — authenticate vendor + create session
authRouter.post("/login", validate({ body: loginSchema }), asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.email, email))
      .limit(1);

    if (!vendor) {
      res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
      return;
    }

    const valid = await comparePassword(password, vendor.passwordHash);
    if (!valid) {
      res.status(401).json({
        error: {
          name: "Unauthorized",
          message: "Invalid email or password",
        },
      });
      return;
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
  }));

// POST /api/auth/logout — destroy session + clean expired sessions
authRouter.post("/logout", asyncHandler(async (req, res) => {
    const token = req.cookies?.session_token;
    if (token) {
      await db.delete(sessions).where(eq(sessions.id, token));
    }

    // Best-effort cleanup of expired sessions
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});

    res.clearCookie("session_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({ message: "Logout successful" });
  }));

// GET /api/auth/me — return current vendor info from session
authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ vendor: req.vendor ?? null });
});

// POST /api/auth/cleanup — admin-triggered expired session purge
authRouter.post("/cleanup", asyncHandler(async (_req, res) => {
    const deleted = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
    res.json({ message: "Expired sessions cleaned up", count: deleted.length });
  }));