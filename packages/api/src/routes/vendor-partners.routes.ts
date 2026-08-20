import { Router } from "express";
import { db } from "../db.js";
import { vendors, vendorPartnerConnections } from "@weddingos/db";
import { eq, and, or, like, ne, notInArray, sql } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const vendorPartnersRouter = Router();

// All routes require auth
vendorPartnersRouter.use(requireAuth);

// GET /api/vendor-partners — list connections (pending, accepted, sent/received)
vendorPartnersRouter.get(
  "/",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;

      const connections = await db
        .select({
          id: vendorPartnerConnections.id,
          fromVendorId: vendorPartnerConnections.fromVendorId,
          toVendorId: vendorPartnerConnections.toVendorId,
          status: vendorPartnerConnections.status,
          message: vendorPartnerConnections.message,
          createdAt: vendorPartnerConnections.createdAt,
          updatedAt: vendorPartnerConnections.updatedAt,
          // Resolve the other vendor's info
          otherVendorId: sql<number>`CASE WHEN ${vendorPartnerConnections.fromVendorId} = ${vendorId} THEN ${vendorPartnerConnections.toVendorId} ELSE ${vendorPartnerConnections.fromVendorId} END`,
        })
        .from(vendorPartnerConnections)
        .where(
          or(
            eq(vendorPartnerConnections.fromVendorId, vendorId),
            eq(vendorPartnerConnections.toVendorId, vendorId),
          ),
        )
        .orderBy(vendorPartnerConnections.createdAt);

      // Enrich with vendor details for the "other" vendor
      const enriched = await Promise.all(
        connections.map(async (conn) => {
          const otherId = conn.fromVendorId === vendorId
            ? conn.toVendorId
            : conn.fromVendorId;

          const [otherVendor] = await db
            .select({
              id: vendors.id,
              name: vendors.name,
              email: vendors.email,
              businessName: vendors.businessName,
            })
            .from(vendors)
            .where(eq(vendors.id, otherId))
            .limit(1);

          return {
            id: conn.id,
            fromVendorId: conn.fromVendorId,
            toVendorId: conn.toVendorId,
            status: conn.status,
            message: conn.message,
            createdAt: conn.createdAt,
            updatedAt: conn.updatedAt,
            isIncoming: conn.toVendorId === vendorId,
            otherVendor: otherVendor || null,
          };
        }),
      );

      res.json({ connections: enriched });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/vendor-partners/request — send a partnership request
vendorPartnersRouter.post(
  "/request",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const fromVendorId = req.vendor!.id;
      const { toVendorId, message } = req.body;

      if (!toVendorId || isNaN(Number(toVendorId))) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "toVendorId is required and must be a number",
          },
        });
      }

      const targetId = Number(toVendorId);

      // Cannot send request to self
      if (targetId === fromVendorId) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Cannot send a partnership request to yourself",
          },
        });
      }

      // Check target vendor exists
      const [targetVendor] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.id, targetId))
        .limit(1);

      if (!targetVendor) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Target vendor not found" },
        });
      }

      // Check no existing connection (in either direction)
      const [existing] = await db
        .select({ id: vendorPartnerConnections.id })
        .from(vendorPartnerConnections)
        .where(
          or(
            and(
              eq(vendorPartnerConnections.fromVendorId, fromVendorId),
              eq(vendorPartnerConnections.toVendorId, targetId),
            ),
            and(
              eq(vendorPartnerConnections.fromVendorId, targetId),
              eq(vendorPartnerConnections.toVendorId, fromVendorId),
            ),
          ),
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({
          error: {
            name: "Conflict",
            message: "A partnership connection already exists with this vendor",
          },
        });
      }

      const [connection] = await db
        .insert(vendorPartnerConnections)
        .values({
          fromVendorId,
          toVendorId: targetId,
          message: message || null,
          status: "pending",
        })
        .returning();

      res.status(201).json({ connection });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/vendor-partners/:id — respond to a request (accept/reject)
vendorPartnersRouter.put(
  "/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const connectionId = Number(req.params.id);
      const { status } = req.body;

      if (isNaN(connectionId)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Invalid connection ID",
          },
        });
      }

      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "status must be 'accepted' or 'rejected'",
          },
        });
      }

      // Find the connection — only the TO vendor can accept/reject
      const [connection] = await db
        .select()
        .from(vendorPartnerConnections)
        .where(
          and(
            eq(vendorPartnerConnections.id, connectionId),
            eq(vendorPartnerConnections.toVendorId, vendorId),
            eq(vendorPartnerConnections.status, "pending"),
          ),
        )
        .limit(1);

      if (!connection) {
        return res.status(404).json({
          error: {
            name: "NotFound",
            message:
              "Pending connection not found or you are not authorized to respond",
          },
        });
      }

      const [updated] = await db
        .update(vendorPartnerConnections)
        .set({ status, updatedAt: new Date() })
        .where(eq(vendorPartnerConnections.id, connectionId))
        .returning();

      res.json({ connection: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/vendor-partners/:id — remove/block a connection
vendorPartnersRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const connectionId = Number(req.params.id);

      if (isNaN(connectionId)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Invalid connection ID",
          },
        });
      }

      // Can only delete if vendor is part of the connection
      const [connection] = await db
        .select()
        .from(vendorPartnerConnections)
        .where(
          and(
            eq(vendorPartnerConnections.id, connectionId),
            or(
              eq(vendorPartnerConnections.fromVendorId, vendorId),
              eq(vendorPartnerConnections.toVendorId, vendorId),
            ),
          ),
        )
        .limit(1);

      if (!connection) {
        return res.status(404).json({
          error: {
            name: "NotFound",
            message: "Connection not found",
          },
        });
      }

      await db
        .delete(vendorPartnerConnections)
        .where(eq(vendorPartnerConnections.id, connectionId));

      res.json({ message: "Connection removed" });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/vendor-partners/search?q= — search vendors to find partners
vendorPartnersRouter.get(
  "/search",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const q = (req.query.q as string) || "";

      if (!q || q.length < 2) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Search query must be at least 2 characters",
          },
        });
      }

      // Get already-connected vendor IDs (to exclude them)
      const existingConnections = await db
        .select({
          otherId: sql<number>`CASE WHEN ${vendorPartnerConnections.fromVendorId} = ${vendorId} THEN ${vendorPartnerConnections.toVendorId} ELSE ${vendorPartnerConnections.fromVendorId} END`,
        })
        .from(vendorPartnerConnections)
        .where(
          or(
            eq(vendorPartnerConnections.fromVendorId, vendorId),
            eq(vendorPartnerConnections.toVendorId, vendorId),
          ),
        );

      const excludeIds = [
        vendorId,
        ...existingConnections.map((c) => c.otherId),
      ];

      const results = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          email: vendors.email,
          businessName: vendors.businessName,
          businessWebsite: vendors.businessWebsite,
          phone: vendors.phone,
        })
        .from(vendors)
        .where(
          and(
            or(
              like(vendors.name, `%${q}%`),
              like(vendors.email, `%${q}%`),
              like(vendors.businessName, `%${q}%`),
            ),
            notInArray(vendors.id, excludeIds),
          ),
        )
        .limit(20);

      res.json({ vendors: results });
    } catch (error) {
      next(error);
    }
  },
);