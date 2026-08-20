import { Router } from "express";
import { db } from "../db.js";
import { platformSettings } from "@weddingos/db";
import { eq } from "drizzle-orm";
import {
  requireAdminAuth,
  type AuthenticatedAdminRequest,
} from "../middleware/admin-auth.js";

export const adminSettingsRouter = Router();

// All admin settings routes require admin auth
adminSettingsRouter.use(requireAdminAuth);

// GET /api/admin/settings — list all platform settings
adminSettingsRouter.get(
  "/",
  async (_req: AuthenticatedAdminRequest, res, next) => {
    try {
      const settings = await db
        .select()
        .from(platformSettings)
        .orderBy(platformSettings.key);

      res.json({ settings });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/admin/settings/:key — get single setting
adminSettingsRouter.get(
  "/:key",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const [setting] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, req.params.key))
        .limit(1);

      if (!setting) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Setting not found" },
        });
      }

      res.json({ setting });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/admin/settings/:key — update a setting
adminSettingsRouter.put(
  "/:key",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const { value, description } = req.body;

      if (value === undefined) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "value is required",
          },
        });
      }

      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, req.params.key))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Setting not found" },
        });
      }

      const updateData: Record<string, unknown> = { value };
      if (description !== undefined) updateData.description = description;

      const [updated] = await db
        .update(platformSettings)
        .set(updateData)
        .where(eq(platformSettings.key, req.params.key))
        .returning();

      res.json({ setting: updated });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/admin/settings — create a new setting
adminSettingsRouter.post(
  "/",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const { key, value, description } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "key and value are required",
          },
        });
      }

      // Check for duplicate key
      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, key))
        .limit(1);

      if (existing) {
        return res.status(409).json({
          error: {
            name: "Conflict",
            message: "A setting with that key already exists",
          },
        });
      }

      const [created] = await db
        .insert(platformSettings)
        .values({ key, value, description })
        .returning();

      res.status(201).json({ setting: created });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/admin/settings/:key — delete a setting
adminSettingsRouter.delete(
  "/:key",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, req.params.key))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Setting not found" },
        });
      }

      await db
        .delete(platformSettings)
        .where(eq(platformSettings.key, req.params.key));

      res.json({ message: "Setting deleted" });
    } catch (error) {
      next(error);
    }
  },
);