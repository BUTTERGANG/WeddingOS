import { Router } from "express";
import { db } from "../db.js";
import { vendors, vendorInquiries } from "@weddingos/db";
import { eq, and, sql } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const vendorMarketplaceRouter = Router();

vendorMarketplaceRouter.use(requireAuth);

// GET /api/vendor/marketplace/profile — get own marketplace profile
vendorMarketplaceRouter.get(
  "/profile",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;

      const [vendor] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, vendorId))
        .limit(1);

      if (!vendor) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Vendor not found" },
        });
      }

      res.json({
        profile: {
          description: vendor.description,
          city: vendor.city,
          state: vendor.state,
          serviceCategories: vendor.serviceCategories,
          profileImage: vendor.profileImage,
          isVisibleInMarketplace: vendor.isVisibleInMarketplace,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/vendor/marketplace/profile — update marketplace fields
vendorMarketplaceRouter.put(
  "/profile",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const { description, city, state, serviceCategories, profileImage, isVisibleInMarketplace } = req.body;

      const updateData: Record<string, unknown> = {};
      if (description !== undefined) updateData.description = description;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (serviceCategories !== undefined) updateData.serviceCategories = serviceCategories;
      if (profileImage !== undefined) updateData.profileImage = profileImage;
      if (isVisibleInMarketplace !== undefined) updateData.isVisibleInMarketplace = isVisibleInMarketplace;

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
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(vendors.id, vendorId))
        .returning();

      res.json({
        profile: {
          description: updated.description,
          city: updated.city,
          state: updated.state,
          serviceCategories: updated.serviceCategories,
          profileImage: updated.profileImage,
          isVisibleInMarketplace: updated.isVisibleInMarketplace,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/vendor/marketplace/inquiries — list inquiries (paginated, filterable)
vendorMarketplaceRouter.get(
  "/inquiries",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const status = req.query.status as string | undefined;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      const conditions = [eq(vendorInquiries.vendorId, vendorId)];
      if (status) {
        conditions.push(eq(vendorInquiries.status, status));
      }

      const result = await db
        .select()
        .from(vendorInquiries)
        .where(and(...conditions))
        .orderBy(sql`${vendorInquiries.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vendorInquiries)
        .where(and(...conditions));

      res.json({
        inquiries: result,
        total: Number(count),
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/vendor/marketplace/inquiries/stats — count by status
vendorMarketplaceRouter.get(
  "/inquiries/stats",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;

      const rows = await db
        .select({
          status: vendorInquiries.status,
          count: sql<number>`count(*)`,
        })
        .from(vendorInquiries)
        .where(eq(vendorInquiries.vendorId, vendorId))
        .groupBy(vendorInquiries.status);

      const stats: Record<string, number> = {
        new: 0,
        read: 0,
        replied: 0,
        archived: 0,
      };
      for (const row of rows) {
        if (row.status) {
          stats[row.status] = Number(row.count);
        }
      }

      const total = Object.values(stats).reduce((a, b) => a + b, 0);

      res.json({ stats, total });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/vendor/marketplace/inquiries/:id — single inquiry detail
vendorMarketplaceRouter.get(
  "/inquiries/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const inquiryId = Number(req.params.id);

      if (isNaN(inquiryId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid inquiry ID" },
        });
      }

      const [inquiry] = await db
        .select()
        .from(vendorInquiries)
        .where(
          and(
            eq(vendorInquiries.id, inquiryId),
            eq(vendorInquiries.vendorId, vendorId),
          ),
        )
        .limit(1);

      if (!inquiry) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Inquiry not found" },
        });
      }

      // Mark as read if it's still "new"
      if (inquiry.status === "new") {
        await db
          .update(vendorInquiries)
          .set({ status: "read", readAt: new Date() })
          .where(eq(vendorInquiries.id, inquiryId));
        inquiry.status = "read";
        inquiry.readAt = new Date();
      }

      res.json({ inquiry });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/vendor/marketplace/inquiries/:id — update inquiry status
vendorMarketplaceRouter.put(
  "/inquiries/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const inquiryId = Number(req.params.id);
      const { status } = req.body;

      if (isNaN(inquiryId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid inquiry ID" },
        });
      }

      if (
        !status ||
        !["new", "read", "replied", "archived"].includes(status)
      ) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message:
              "Status must be one of: new, read, replied, archived",
          },
        });
      }

      const updateData: Record<string, unknown> = { status };
      if (status === "read") {
        updateData.readAt = new Date();
      }

      const [updated] = await db
        .update(vendorInquiries)
        .set(updateData)
        .where(
          and(
            eq(vendorInquiries.id, inquiryId),
            eq(vendorInquiries.vendorId, vendorId),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Inquiry not found" },
        });
      }

      res.json({ inquiry: updated });
    } catch (error) {
      next(error);
    }
  },
);