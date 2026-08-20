import { Router } from "express";
import { db } from "../db.js";
import { clients } from "@weddingos/db";
import { eq, and, like } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const clientsRouter = Router();

// All client routes require auth
clientsRouter.use(requireAuth);

// GET /api/clients — list clients for current vendor (with optional search)
clientsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const search = req.query.search as string | undefined;

    let result;
    if (search) {
      result = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.vendorId, vendorId),
            like(clients.name, `%${search}%`),
          ),
        )
        .orderBy(clients.createdAt);
    } else {
      result = await db
        .select()
        .from(clients)
        .where(eq(clients.vendorId, vendorId))
        .orderBy(clients.createdAt);
    }

    res.json({ clients: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients — create a new client
clientsRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { name, email, phone, partnerName, weddingDate, venue, notes, status } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "name and email are required",
        },
      });
    }

    const [client] = await db
      .insert(clients)
      .values({
        vendorId,
        name,
        email,
        phone: phone ?? null,
        partnerName: partnerName ?? null,
        weddingDate: weddingDate ?? null,
        venue: venue ?? null,
        notes: notes ?? null,
        status: status ?? "lead",
      })
      .returning();

    res.status(201).json({ client });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id — get client details (verify vendor owns)
clientsRouter.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId)))
      .limit(1);

    if (!client) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    res.json({ client });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/clients/:id — update client
clientsRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    const { name, email, phone, partnerName, weddingDate, venue, notes, status } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (partnerName !== undefined) updateData.partnerName = partnerName;
    if (weddingDate !== undefined) updateData.weddingDate = weddingDate;
    if (venue !== undefined) updateData.venue = venue;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();

    res.json({ client: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id — archive client
clientsRouter.delete("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    // Soft-delete: set status to 'archived'
    const [archived] = await db
      .update(clients)
      .set({ status: "archived" })
      .where(eq(clients.id, clientId))
      .returning();

    res.json({ client: archived, message: "Client archived" });
  } catch (error) {
    next(error);
  }
});