import { Router } from "express";
import { db } from "../db.js";
import { calendarSlots } from "@weddingos/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";

export const calendarRouter = Router();

calendarRouter.use(requireAuth);

// GET /api/calendar/available — list available slots for this vendor
calendarRouter.get("/available", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 864e5);

    const slots = await db
      .select()
      .from(calendarSlots)
      .where(
        and(
          eq(calendarSlots.vendorId, vendorId),
          eq(calendarSlots.isBooked, false),
          gte(calendarSlots.startTime, start),
          lte(calendarSlots.startTime, end),
        ),
      )
      .orderBy(calendarSlots.startTime);

    res.json({ slots });
  } catch (error) {
    next(error);
  }
});

// GET /api/calendar — list slots for vendor (query: startDate, endDate)
calendarRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { startDate, endDate } = req.query;

    let result;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          error: {
            name: "ValidationError",
            message: "startDate and endDate must be valid ISO date strings",
          },
        });
      }

      result = await db
        .select()
        .from(calendarSlots)
        .where(
          and(
            eq(calendarSlots.vendorId, vendorId),
            gte(calendarSlots.startTime, start),
            lte(calendarSlots.startTime, end),
          ),
        )
        .orderBy(calendarSlots.startTime);
    } else {
      result = await db
        .select()
        .from(calendarSlots)
        .where(eq(calendarSlots.vendorId, vendorId))
        .orderBy(calendarSlots.startTime);
    }

    res.json({ slots: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/calendar — create availability slot
calendarRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const { startTime, endTime, serviceType, notes } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "startTime and endTime are required",
        },
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "startTime and endTime must be valid ISO date strings",
        },
      });
    }

    const [slot] = await db
      .insert(calendarSlots)
      .values({
        vendorId,
        startTime: start,
        endTime: end,
        serviceType: serviceType ?? null,
        notes: notes ?? null,
        isBooked: false,
      })
      .returning();

    res.status(201).json({ slot });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/calendar/:id — update slot
calendarRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const slotId = Number(req.params.id);

    if (isNaN(slotId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid slot ID" },
      });
    }

    const [existing] = await db
      .select()
      .from(calendarSlots)
      .where(
        and(eq(calendarSlots.id, slotId), eq(calendarSlots.vendorId, vendorId)),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Calendar slot not found" },
      });
    }

    const { startTime, endTime, isBooked, clientId, serviceType, notes } = req.body;

    const updateData: Record<string, unknown> = {};
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (isBooked !== undefined) updateData.isBooked = isBooked;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (serviceType !== undefined) updateData.serviceType = serviceType;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(calendarSlots)
      .set(updateData)
      .where(eq(calendarSlots.id, slotId))
      .returning();

    res.json({ slot: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/calendar/:id — delete slot
calendarRouter.delete("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const slotId = Number(req.params.id);

    if (isNaN(slotId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid slot ID" },
      });
    }

    const [existing] = await db
      .select()
      .from(calendarSlots)
      .where(
        and(eq(calendarSlots.id, slotId), eq(calendarSlots.vendorId, vendorId)),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Calendar slot not found" },
      });
    }

    await db.delete(calendarSlots).where(eq(calendarSlots.id, slotId));

    res.json({ message: "Slot deleted" });
  } catch (error) {
    next(error);
  }
});