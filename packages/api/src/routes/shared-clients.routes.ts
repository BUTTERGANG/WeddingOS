import { Router } from "express";
import { db } from "../db.js";
import { clients, vendors, sharedClients, vendorPartnerConnections } from "@weddingos/db";
import { eq, and, or } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const sharedClientsRouter = Router();

// All routes require auth
sharedClientsRouter.use(requireAuth);

// GET /api/shared-clients — list shared clients (incoming + outgoing)
sharedClientsRouter.get(
  "/",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;

      // Clients shared WITH me (incoming access — I am the vendorId in shared_clients)
      const incomingRaw = await db
        .select({
          id: sharedClients.id,
          clientId: sharedClients.clientId,
          vendorId: sharedClients.vendorId,
          ownerVendorId: sharedClients.ownerVendorId,
          permission: sharedClients.permission,
          createdAt: sharedClients.createdAt,
        })
        .from(sharedClients)
        .where(eq(sharedClients.vendorId, vendorId))
        .orderBy(sharedClients.createdAt);

      const incoming = await Promise.all(
        incomingRaw.map(async (sc) => {
          const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, sc.clientId))
            .limit(1);

          const [ownerVendor] = await db
            .select({
              id: vendors.id,
              name: vendors.name,
              email: vendors.email,
              businessName: vendors.businessName,
            })
            .from(vendors)
            .where(eq(vendors.id, sc.ownerVendorId))
            .limit(1);

          return {
            id: sc.id,
            clientId: sc.clientId,
            permission: sc.permission,
            createdAt: sc.createdAt,
            client: client || null,
            ownerVendor: ownerVendor || null,
          };
        }),
      );

      // Clients I have shared (outgoing — I am the ownerVendorId)
      const outgoingRaw = await db
        .select()
        .from(sharedClients)
        .where(eq(sharedClients.ownerVendorId, vendorId))
        .orderBy(sharedClients.createdAt);

      const outgoing = await Promise.all(
        outgoingRaw.map(async (sc) => {
          const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, sc.clientId))
            .limit(1);

          const [partnerVendor] = await db
            .select({
              id: vendors.id,
              name: vendors.name,
              email: vendors.email,
              businessName: vendors.businessName,
            })
            .from(vendors)
            .where(eq(vendors.id, sc.vendorId))
            .limit(1);

          return {
            id: sc.id,
            clientId: sc.clientId,
            vendorId: sc.vendorId,
            permission: sc.permission,
            createdAt: sc.createdAt,
            client: client || null,
            partnerVendor: partnerVendor || null,
          };
        }),
      );

      res.json({ incoming, outgoing });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/shared-clients — share a client with a partner
sharedClientsRouter.post(
  "/",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const ownerVendorId = req.vendor!.id;
      const { clientId, vendorId: targetVendorId, permission } = req.body;

      if (!clientId || isNaN(Number(clientId))) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "clientId is required and must be a number",
          },
        });
      }

      if (!targetVendorId || isNaN(Number(targetVendorId))) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "vendorId is required and must be a number",
          },
        });
      }

      const targetId = Number(targetVendorId);
      const cId = Number(clientId);

      // Validate permission
      const validPermissions = ["read", "write", "admin"];
      const perm = permission && validPermissions.includes(permission)
        ? permission
        : "read";

      // Verify the client belongs to the current vendor
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, cId), eq(clients.vendorId, ownerVendorId)))
        .limit(1);

      if (!client) {
        return res.status(404).json({
          error: {
            name: "NotFound",
            message: "Client not found or you do not own this client",
          },
        });
      }

      // Verify the target vendor is an accepted partner
      const [connection] = await db
        .select()
        .from(vendorPartnerConnections)
        .where(
          and(
            or(
              and(
                eq(vendorPartnerConnections.fromVendorId, ownerVendorId),
                eq(vendorPartnerConnections.toVendorId, targetId),
              ),
              and(
                eq(vendorPartnerConnections.fromVendorId, targetId),
                eq(vendorPartnerConnections.toVendorId, ownerVendorId),
              ),
            ),
            eq(vendorPartnerConnections.status, "accepted"),
          ),
        )
        .limit(1);

      if (!connection) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message:
              "You can only share clients with accepted partners",
          },
        });
      }

      // Check if already shared
      const [existing] = await db
        .select()
        .from(sharedClients)
        .where(
          and(
            eq(sharedClients.clientId, cId),
            eq(sharedClients.vendorId, targetId),
          ),
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({
          error: {
            name: "Conflict",
            message: "This client is already shared with this vendor",
          },
        });
      }

      const [share] = await db
        .insert(sharedClients)
        .values({
          clientId: cId,
          vendorId: targetId,
          ownerVendorId,
          permission: perm,
        })
        .returning();

      res.status(201).json({ sharedClient: share });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/shared-clients/:id — update permission level
sharedClientsRouter.put(
  "/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const ownerVendorId = req.vendor!.id;
      const shareId = Number(req.params.id);
      const { permission } = req.body;

      if (isNaN(shareId)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Invalid shared client ID",
          },
        });
      }

      const validPermissions = ["read", "write", "admin"];
      if (!permission || !validPermissions.includes(permission)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message:
              "permission must be one of: read, write, admin",
          },
        });
      }

      // Only the owner can update permission
      const [existing] = await db
        .select()
        .from(sharedClients)
        .where(
          and(
            eq(sharedClients.id, shareId),
            eq(sharedClients.ownerVendorId, ownerVendorId),
          ),
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          error: {
            name: "NotFound",
            message:
              "Shared client not found or you are not the owner",
          },
        });
      }

      const [updated] = await db
        .update(sharedClients)
        .set({ permission })
        .where(eq(sharedClients.id, shareId))
        .returning();

      res.json({ sharedClient: updated });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/shared-clients/:id — revoke access
sharedClientsRouter.delete(
  "/:id",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const shareId = Number(req.params.id);

      if (isNaN(shareId)) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Invalid shared client ID",
          },
        });
      }

      // Owner can revoke, or the recipient can remove themselves
      const [existing] = await db
        .select()
        .from(sharedClients)
        .where(
          and(
            eq(sharedClients.id, shareId),
            or(
              eq(sharedClients.ownerVendorId, vendorId),
              eq(sharedClients.vendorId, vendorId),
            ),
          ),
        )
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          error: {
            name: "NotFound",
            message: "Shared client not found",
          },
        });
      }

      await db
        .delete(sharedClients)
        .where(eq(sharedClients.id, shareId));

      res.json({ message: "Access revoked" });
    } catch (error) {
      next(error);
    }
  },
);