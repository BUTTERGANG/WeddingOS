import type { Response, NextFunction } from "express";
import { db } from "../db.js";
import { clients, sharedClients } from "@weddingos/db";
import { eq, and, or } from "drizzle-orm";
import {
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export type AccessLevel = "read" | "write" | "admin" | "owner";

export interface SharedAccessRequest extends AuthenticatedRequest {
  accessLevel?: AccessLevel;
}

/**
 * Middleware that checks if a client belongs to the vendor OR is shared with them.
 * Takes a `clientIdSource` function that extracts the clientId from req (params, body, etc.).
 * Passes `accessLevel` on req for the route to use.
 *
 * - If owned by req.vendor.id → accessLevel = "owner"
 * - If shared with READ permission → accessLevel = "read" (GET allowed, mutations blocked)
 * - If shared with WRITE permission → accessLevel = "write" (mutations allowed)
 * - If shared with ADMIN permission → accessLevel = "admin"
 * - Otherwise → 403
 */
export function allowSharedClientAccess(
  clientIdSource: (req: AuthenticatedRequest) => number | null,
) {
  return async (
    req: SharedAccessRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const vendorId = req.vendor!.id;
      const clientId = clientIdSource(req);

      if (!clientId || isNaN(clientId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid client ID" },
        });
      }

      // Check if the vendor owns this client
      const [client] = await db
        .select({ id: clients.id, vendorId: clients.vendorId })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (!client) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Client not found" },
        });
      }

      // Owner gets full access
      if (client.vendorId === vendorId) {
        req.accessLevel = "owner";
        return next();
      }

      // Check shared access
      const [share] = await db
        .select({ permission: sharedClients.permission })
        .from(sharedClients)
        .where(
          and(
            eq(sharedClients.clientId, clientId),
            eq(sharedClients.vendorId, vendorId),
          ),
        )
        .limit(1);

      if (!share) {
        return res.status(403).json({
          error: {
            name: "Forbidden",
            message: "You do not have access to this client",
          },
        });
      }

      req.accessLevel = share.permission as AccessLevel;
      next();
    } catch (error) {
      next(error);
    }
  };
}