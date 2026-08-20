import { Router } from "express";
import { db } from "../db.js";
import { vendors, vendorInquiries } from "@weddingos/db";
import { eq, and, or, like, ilike, sql } from "drizzle-orm";

export const marketplaceRouter = Router();

// GET /api/marketplace/vendors — list visible vendors with filters
marketplaceRouter.get("/vendors", async (req, res, next) => {
  try {
    const {
      city,
      state,
      service,
      q,
      page: pageStr,
      limit: limitStr,
    } = req.query as Record<string, string | undefined>;

    const page = Math.max(1, Number(pageStr) || 1);
    const limit = Math.min(50, Math.max(1, Number(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(vendors.isVisibleInMarketplace, true)];

    if (city) {
      conditions.push(ilike(vendors.city, `%${city}%`));
    }
    if (state) {
      conditions.push(ilike(vendors.state, `%${state}%`));
    }
    if (service) {
      conditions.push(
        sql`${vendors.serviceCategories} @> ARRAY[${service}]::text[]`,
      );
    }
    if (q) {
      const searchCondition = or(
        ilike(vendors.businessName, `%${q}%`),
        ilike(vendors.name, `%${q}%`),
        ilike(vendors.city, `%${q}%`),
        ilike(vendors.state, `%${q}%`),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const result = await db
      .select({
        id: vendors.id,
        businessName: vendors.businessName,
        description: vendors.description,
        city: vendors.city,
        state: vendors.state,
        serviceCategories: vendors.serviceCategories,
        profileImage: vendors.profileImage,
        businessWebsite: vendors.businessWebsite,
      })
      .from(vendors)
      .where(and(...conditions))
      .orderBy(vendors.businessName)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vendors)
      .where(and(...conditions));

    res.json({
      vendors: result,
      total: Number(count),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/marketplace/vendors/:id — public vendor profile
marketplaceRouter.get("/vendors/:id", async (req, res, next) => {
  try {
    const vendorId = Number(req.params.id);

    if (isNaN(vendorId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid vendor ID" },
      });
    }

    const [vendor] = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        businessName: vendors.businessName,
        description: vendors.description,
        city: vendors.city,
        state: vendors.state,
        serviceCategories: vendors.serviceCategories,
        profileImage: vendors.profileImage,
        businessWebsite: vendors.businessWebsite,
        phone: vendors.phone,
      })
      .from(vendors)
      .where(
        and(
          eq(vendors.id, vendorId),
          eq(vendors.isVisibleInMarketplace, true),
        ),
      )
      .limit(1);

    if (!vendor) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Vendor not found" },
      });
    }

    res.json({ vendor });
  } catch (error) {
    next(error);
  }
});

// POST /api/marketplace/inquiries — submit an inquiry to a vendor
marketplaceRouter.post("/inquiries", async (req, res, next) => {
  try {
    const { vendorId, name, email, phone, weddingDate, venue, message, serviceInterest } = req.body;

    if (!vendorId || !name || !email || !message) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "vendorId, name, email, and message are required",
        },
      });
    }

    // Verify vendor exists and is visible in marketplace
    const [vendor] = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(
        and(
          eq(vendors.id, vendorId),
          eq(vendors.isVisibleInMarketplace, true),
        ),
      )
      .limit(1);

    if (!vendor) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Vendor not found" },
      });
    }

    const [inquiry] = await db
      .insert(vendorInquiries)
      .values({
        vendorId,
        name,
        email,
        phone: phone ?? null,
        weddingDate: weddingDate ?? null,
        venue: venue ?? null,
        message,
        serviceInterest: serviceInterest ?? null,
      })
      .returning();

    res.status(201).json({ inquiry });
  } catch (error) {
    next(error);
  }
});