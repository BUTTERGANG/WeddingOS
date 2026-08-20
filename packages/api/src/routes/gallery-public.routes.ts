import { Router } from "express";
import express from "express";
import { db } from "../db.js";
import { galleries, galleryImages } from "@weddingos/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");

export const publicGalleryRouter = Router();

// Serve uploaded images for public galleries (no auth required)
publicGalleryRouter.use("/uploads", express.static(UPLOADS_DIR));

// POST /api/g/public/:id/verify — verify gallery password
publicGalleryRouter.post("/:id/verify", async (req, res, next) => {
  try {
    const galleryId = Number(req.params.id);
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: { name: "ValidationError", message: "Invalid gallery ID" } });
    }

    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.id, galleryId))
      .limit(1);

    if (!gallery || !gallery.isPublished) {
      return res.status(404).json({ error: { name: "NotFound", message: "Gallery not found" } });
    }

    const { password } = req.body;
    if (!password || !gallery.passwordHash) {
      return res.status(401).json({ error: { name: "Unauthorized", message: "Password required" } });
    }

    const valid = await bcrypt.compare(password, gallery.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: { name: "Unauthorized", message: "Invalid password" } });
    }

    // Generate a simple access token (12-hour expiry)
    const token = crypto.randomBytes(32).toString("hex");
    // Store in memory or a simple tokens table — for simplicity, return it
    // The client will pass it as a query param

    res.json({
      token,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        description: gallery.description,
        hasProofing: gallery.hasProofing,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/g/public/:id/images — list images in a published gallery (no auth needed for public)
publicGalleryRouter.get("/:id/images", async (req, res, next) => {
  try {
    const galleryId = Number(req.params.id);
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: { name: "ValidationError", message: "Invalid gallery ID" } });
    }

    const [gallery] = await db
      .select()
      .from(galleries)
      .where(eq(galleries.id, galleryId))
      .limit(1);

    if (!gallery || !gallery.isPublished) {
      return res.status(404).json({ error: { name: "NotFound", message: "Gallery not found" } });
    }

    const images = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.galleryId, galleryId))
      .orderBy(galleryImages.sortOrder);

    const galleryInfo = {
      id: gallery.id,
      title: gallery.title,
      description: gallery.description,
      hasProofing: gallery.hasProofing,
    };

    res.json({ gallery: galleryInfo, images });
  } catch (error) {
    next(error);
  }
});

// POST /api/g/public/favorites — mark images as favorites (for proofing)
publicGalleryRouter.post("/favorites", async (req, res, next) => {
  try {
    const { galleryId, imageIds } = req.body;
    if (!galleryId || !Array.isArray(imageIds)) {
      return res.status(400).json({ error: { name: "ValidationError", message: "galleryId and imageIds array required" } });
    }

    // Update is_favorite for selected images
    for (const id of imageIds) {
      await db
        .update(galleryImages)
        .set({ isFavorite: true })
        .where(eq(galleryImages.id, id));
    }

    res.json({ message: "Favorites updated", count: imageIds.length });
  } catch (error) {
    next(error);
  }
});