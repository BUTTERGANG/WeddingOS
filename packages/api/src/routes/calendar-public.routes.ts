import { Router } from "express";
import { db } from "../db.js";
import { calendarSlots, clients } from "@weddingos/db";
import { eq, and, gte, lte } from "drizzle-orm";

export const publicCalendarRouter = Router();

// GET /api/calendar/public/:vendorId/available — list available slots for a vendor
publicCalendarRouter.get("/:vendorId/available", async (req, res, next) => {
  try {
    const vendorId = Number(req.params.vendorId);
    const { startDate, endDate } = req.query;

    // Default to next 14 days
    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate
      ? new Date(endDate as string)
      : new Date(Date.now() + 14 * 864e5);

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

// POST /api/calendar/public/:vendorId/book — book a slot
publicCalendarRouter.post("/:vendorId/book", async (req, res, next) => {
  try {
    const vendorId = Number(req.params.vendorId);
    const { slotId, clientName, clientEmail, clientPhone, notes } = req.body;

    if (!slotId || !clientName || !clientEmail) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "slotId, clientName, and clientEmail are required",
        },
      });
    }

    // Verify slot exists, is available, and belongs to this vendor
    const [slot] = await db
      .select()
      .from(calendarSlots)
      .where(
        and(
          eq(calendarSlots.id, slotId),
          eq(calendarSlots.vendorId, vendorId),
          eq(calendarSlots.isBooked, false),
        ),
      )
      .limit(1);

    if (!slot) {
      return res
        .status(404)
        .json({ error: { name: "NotFound", message: "Slot not available" } });
    }

    // Create a client record if one doesn't exist
    let clientId: number;
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(
        and(eq(clients.vendorId, vendorId), eq(clients.email, clientEmail)),
      )
      .limit(1);

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          vendorId,
          name: clientName,
          email: clientEmail,
          phone: clientPhone ?? null,
          status: "lead",
        })
        .returning();
      clientId = newClient.id;
    }

    // Mark slot as booked
    await db
      .update(calendarSlots)
      .set({ isBooked: true, clientId, notes: notes ?? null })
      .where(eq(calendarSlots.id, slotId));

    // Send confirmation email (best-effort)
    try {
      const { sendTransactional } = await import("../lib/mail.js");
      await sendTransactional({
        to: clientEmail,
        subject: "Booking Confirmed",
        text: `Hello ${clientName},\n\nYour booking has been confirmed!\n\nDate: ${slot.startTime.toLocaleDateString()}\nTime: ${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()}\n\nWe look forward to meeting with you!`,
      });
    } catch {
      // Email is best-effort
    }

    res.json({
      message: "Slot booked successfully",
      clientId,
      slot: {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
  } catch (error) {
    next(error);
  }
});