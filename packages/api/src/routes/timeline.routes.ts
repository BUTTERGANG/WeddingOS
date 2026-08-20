import { Router } from "express";
import { db } from "../db.js";
import { timelineEvents, clients } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const timelineRouter = Router();

// All timeline routes require auth
timelineRouter.use(requireAuth);

// Helper: verify the client belongs to this vendor
async function verifyClientOwnership(
  clientId: number,
  vendorId: number,
): Promise<boolean> {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorId)))
    .limit(1);
  return !!client;
}

// GET /api/timeline/:clientId — list timeline events for a client
timelineRouter.get("/:clientId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.clientId);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    const events = await db
      .select()
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.clientId, clientId),
          eq(timelineEvents.vendorId, vendorId),
        ),
      )
      .orderBy(timelineEvents.sortOrder, timelineEvents.eventDate);

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

// POST /api/timeline/:clientId — create event
timelineRouter.post("/:clientId", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const clientId = Number(req.params.clientId);

    if (isNaN(clientId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid client ID" },
      });
    }

    const owns = await verifyClientOwnership(clientId, vendorId);
    if (!owns) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    const { title, description, eventDate, startTime, endTime, location, category, sortOrder, color } = req.body;

    if (!title) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "title is required" },
      });
    }

    const [event] = await db
      .insert(timelineEvents)
      .values({
        vendorId,
        clientId,
        title,
        description: description ?? null,
        eventDate: eventDate ?? null,
        startTime: startTime ?? null,
        endTime: endTime ?? null,
        location: location ?? null,
        category: category ?? "general",
        sortOrder: sortOrder ?? 0,
        color: color ?? null,
      })
      .returning();

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/timeline/events/:id — update event
timelineRouter.patch("/events/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const eventId = Number(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid event ID" },
      });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(timelineEvents)
      .where(
        and(eq(timelineEvents.id, eventId), eq(timelineEvents.vendorId, vendorId)),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Timeline event not found" },
      });
    }

    const { title, description, eventDate, startTime, endTime, location, category, sortOrder, color } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (location !== undefined) updateData.location = location;
    if (category !== undefined) updateData.category = category;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (color !== undefined) updateData.color = color;

    const [updated] = await db
      .update(timelineEvents)
      .set(updateData)
      .where(eq(timelineEvents.id, eventId))
      .returning();

    res.json({ event: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/timeline/events/:id — delete event
timelineRouter.delete("/events/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const eventId = Number(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid event ID" },
      });
    }

    const [existing] = await db
      .select()
      .from(timelineEvents)
      .where(
        and(eq(timelineEvents.id, eventId), eq(timelineEvents.vendorId, vendorId)),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Timeline event not found" },
      });
    }

    await db.delete(timelineEvents).where(eq(timelineEvents.id, eventId));

    res.json({ message: "Event deleted" });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/timeline/reorder — batch update sort_order
timelineRouter.patch("/reorder", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "items array is required",
        },
      });
    }

    for (const item of items) {
      if (typeof item.id !== "number" || typeof item.sort_order !== "number") {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "Each item must have id (number) and sort_order (number)",
          },
        });
      }

      // Only update if this vendor owns the event
      await db
        .update(timelineEvents)
        .set({ sortOrder: item.sort_order })
        .where(
          and(
            eq(timelineEvents.id, item.id),
            eq(timelineEvents.vendorId, vendorId),
          ),
        );
    }

    res.json({ message: "Reorder successful" });
  } catch (error) {
    next(error);
  }
});