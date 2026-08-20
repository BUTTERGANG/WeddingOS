import { Router } from "express";
import { db } from "../db.js";
import {
  vendors,
  clients,
  invoices,
  contracts,
} from "@weddingos/db";
import { eq, desc, sql, and, like } from "drizzle-orm";
import {
  requireAdminAuth,
  type AuthenticatedAdminRequest,
} from "../middleware/admin-auth.js";

export const adminRouter = Router();

// All admin routes require admin auth
adminRouter.use(requireAdminAuth);

// GET /api/admin/dashboard — admin dashboard stats
adminRouter.get(
  "/dashboard",
  async (_req: AuthenticatedAdminRequest, res, next) => {
    try {
      const [vendorCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vendors);

      const [clientCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(clients);

      const [invoiceResult] = await db
        .select({
          total: sql<number>`count(*)`,
          paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`,
          revenue: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} = 'paid'), 0)`,
        })
        .from(invoices);

      const [contractCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(contracts);

      const [activeVendors] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vendors)
        .where(
          sql`${vendors.id} IN (select distinct vendor_id from clients where status = 'active')`,
        );

      const recentVendors = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          businessName: vendors.businessName,
          createdAt: vendors.createdAt,
        })
        .from(vendors)
        .orderBy(desc(vendors.createdAt))
        .limit(10);

      res.json({
        stats: {
          totalVendors: Number(vendorCount.count),
          totalClients: Number(clientCount.count),
          totalInvoices: Number(invoiceResult.total),
          paidInvoices: Number(invoiceResult.paid),
          totalRevenueCents: Number(invoiceResult.revenue),
          totalContracts: Number(contractCount.count),
          activeVendors: Number(activeVendors.count),
        },
        recentVendors,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/admin/vendors — list all vendors (paginated, searchable)
adminRouter.get(
  "/vendors",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = req.query.search as string | undefined;

      const conditions = [];
      if (search) {
        conditions.push(
          sql`(${vendors.name} ILIKE ${`%${search}%`} OR ${vendors.email} ILIKE ${`%${search}%`} OR ${vendors.businessName} ILIKE ${`%${search}%`})`,
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vendors)
        .where(whereClause);

      const vendorList = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          businessName: vendors.businessName,
          businessWebsite: vendors.businessWebsite,
          phone: vendors.phone,
          createdAt: vendors.createdAt,
        })
        .from(vendors)
        .where(whereClause)
        .orderBy(desc(vendors.createdAt))
        .limit(limit)
        .offset(offset);

      // Get client counts for each vendor
      const vendorIds = vendorList.map((v) => v.id);
      let clientCounts: Array<{ vendorId: number; count: number }> = [];
      if (vendorIds.length > 0) {
        clientCounts = await db
          .select({
            vendorId: clients.vendorId,
            count: sql<number>`count(*)`,
          })
          .from(clients)
          .where(sql`${clients.vendorId} = ANY(${vendorIds})`)
          .groupBy(clients.vendorId);
      }

      const clientCountMap = new Map(
        clientCounts.map((c) => [c.vendorId, Number(c.count)]),
      );

      const vendorsWithCounts = vendorList.map((v) => ({
        ...v,
        clientCount: clientCountMap.get(v.id) ?? 0,
      }));

      res.json({
        vendors: vendorsWithCounts,
        total: Number(countResult.count),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult.count) / limit),
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/admin/vendors/:id — single vendor detail
adminRouter.get(
  "/vendors/:id",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid vendor ID" },
        });
      }

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

      const [clientCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(clients)
        .where(eq(clients.vendorId, vendorId));

      const [invoiceCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.vendorId, vendorId));

      // Strip password hash from response
      const { passwordHash, ...vendorWithoutPassword } = vendor;

      res.json({
        vendor: {
          ...vendorWithoutPassword,
          clientCount: Number(clientCount.count),
          invoiceCount: Number(invoiceCount.count),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /api/admin/vendors/:id — update vendor (suspend, etc.)
adminRouter.patch(
  "/vendors/:id",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid vendor ID" },
        });
      }

      const [existing] = await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, vendorId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Vendor not found" },
        });
      }

      const { name, businessName, businessWebsite, phone, email } = req.body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (businessName !== undefined) updateData.businessName = businessName;
      if (businessWebsite !== undefined) updateData.businessWebsite = businessWebsite;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;

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

      const { passwordHash, ...vendorWithoutPassword } = updated;

      res.json({ vendor: vendorWithoutPassword });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/admin/vendors/:id/stats — vendor-specific stats
adminRouter.get(
  "/vendors/:id/stats",
  async (req: AuthenticatedAdminRequest, res, next) => {
    try {
      const vendorId = parseInt(req.params.id);
      if (isNaN(vendorId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid vendor ID" },
        });
      }

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

      const [clientStats] = await db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where ${clients.status} = 'active')`,
          lead: sql<number>`count(*) filter (where ${clients.status} = 'lead')`,
          archived: sql<number>`count(*) filter (where ${clients.status} = 'archived')`,
        })
        .from(clients)
        .where(eq(clients.vendorId, vendorId));

      const [invoiceStats] = await db
        .select({
          total: sql<number>`count(*)`,
          paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`,
          overdue: sql<number>`count(*) filter (where ${invoices.status} = 'overdue')`,
          draft: sql<number>`count(*) filter (where ${invoices.status} = 'draft')`,
          revenueCents: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} = 'paid'), 0)`,
          outstandingCents: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.status} IN ('sent', 'overdue')), 0)`,
        })
        .from(invoices)
        .where(eq(invoices.vendorId, vendorId));

      const [contractStats] = await db
        .select({
          total: sql<number>`count(*)`,
          signed: sql<number>`count(*) filter (where ${contracts.status} = 'signed')`,
          draft: sql<number>`count(*) filter (where ${contracts.status} = 'draft')`,
        })
        .from(contracts)
        .where(eq(contracts.vendorId, vendorId));

      res.json({
        stats: {
          clients: {
            total: Number(clientStats.total),
            active: Number(clientStats.active),
            lead: Number(clientStats.lead),
            archived: Number(clientStats.archived),
          },
          invoices: {
            total: Number(invoiceStats.total),
            paid: Number(invoiceStats.paid),
            overdue: Number(invoiceStats.overdue),
            draft: Number(invoiceStats.draft),
            revenueCents: Number(invoiceStats.revenueCents),
            outstandingCents: Number(invoiceStats.outstandingCents),
          },
          contracts: {
            total: Number(contractStats.total),
            signed: Number(contractStats.signed),
            draft: Number(contractStats.draft),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);