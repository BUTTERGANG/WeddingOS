import { Router } from "express";
import { db } from "../db.js";
import { vendors } from "@weddingos/db";
import { eq } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const vendorsRouter = Router();

// All vendor routes require auth
vendorsRouter.use(requireAuth);

// GET /api/vendors/profile — get own vendor profile
vendorsRouter.get("/profile", (req: AuthenticatedRequest, res) => {
  res.json({ vendor: req.vendor });
});

// PATCH /api/vendors/profile — update business info
vendorsRouter.patch("/profile", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { name, businessName, businessWebsite, phone } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessWebsite !== undefined) updateData.businessWebsite = businessWebsite;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "No fields to update",
        },
      });
    }

    const [updated] = await db
      .update(vendors)
      .set(updateData)
      .where(eq(vendors.id, vendorId))
      .returning();

    res.json({
      vendor: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        businessName: updated.businessName,
        businessWebsite: updated.businessWebsite,
        phone: updated.phone,
      },
    });
  } catch (error) {
    next(error);
  }
});