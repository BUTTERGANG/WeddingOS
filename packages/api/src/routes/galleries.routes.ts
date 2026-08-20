import { Router } from "express";
import { db } from "../db.js";
import { galleries, galleryImages, clients } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");

export const galleriesRouter = Router();

galleriesRouter.use(requireAuth);

// Helper: verify client ownership
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

// Helper: verify gallery ownership (vendor owns the gallery)
async function verifyGalleryOwnership(
  galleryId: number,
  vendorId: number,
) {
  const [gallery] = await db
    .select()
    .from(galleries)
    .where(and(eq(galleries.id, galleryId), eq(galleries.vendorId, vendorId)))
    .limit(1);
  return gallery || null;
}

// GET /api/galleries/:clientId — list galleries for a client
galleriesRouter.get("/:clientId", async (req: AuthenticatedRequest, res, next) => {
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

    const result = await db
      .select()
      .from(galleries)
      .where(
        and(eq(galleries.clientId, clientId), eq(galleries.vendorId, vendorId)),
      )
      .orderBy(galleries.createdAt);

    res.json({ galleries: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/galleries/:clientId — create gallery
galleriesRouter.post("/:clientId", async (req: AuthenticatedRequest, res, next) => {
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

    const { title, description, isPublished, hasProofing } = req.body;

    if (!title) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "title is required" },
      });
    }

    const [gallery] = await db
      .insert(galleries)
      .values({
        vendorId,
        clientId,
        title,
        description: description ?? null,
        isPublished: isPublished ?? false,
        hasProofing: hasProofing ?? false,
      })
      .returning();

    res.status(201).json({ gallery });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/galleries/:id — update gallery settings
galleriesRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const galleryId = Number(req.params.id);

    if (isNaN(galleryId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid gallery ID" },
      });
    }

    const gallery = await verifyGalleryOwnership(galleryId, vendorId);
    if (!gallery) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Gallery not found" },
      });
    }

    const { title, description, isPublished, hasProofing, passwordHash } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (hasProofing !== undefined) updateData.hasProofing = hasProofing;
    if (passwordHash !== undefined) updateData.passwordHash = passwordHash;

    const [updated] = await db
      .update(galleries)
      .set(updateData)
      .where(eq(galleries.id, galleryId))
      .returning();

    res.json({ gallery: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/galleries/:id — delete gallery
galleriesRouter.delete("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const galleryId = Number(req.params.id);

    if (isNaN(galleryId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid gallery ID" },
      });
    }

    const gallery = await verifyGalleryOwnership(galleryId, vendorId);
    if (!gallery) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Gallery not found" },
      });
    }

    await db.delete(galleries).where(eq(galleries.id, galleryId));

    res.json({ message: "Gallery deleted" });
  } catch (error) {
    next(error);
  }
});

// POST /api/galleries/:id/upload — upload images (multipart, local storage)
galleriesRouter.post("/:id/upload", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const galleryId = Number(req.params.id);

    if (isNaN(galleryId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid gallery ID" },
      });
    }

    const gallery = await verifyGalleryOwnership(galleryId, vendorId);
    if (!gallery) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Gallery not found" },
      });
    }

    // Check for uploaded files
    const files = (req as any).files as { fieldname: string; originalname: string; encoding: string; mimetype: string; buffer: Buffer; size: number; }[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "No files uploaded. Use multipart/form-data with field name 'images'",
        },
      });
    }

    // Ensure uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const uploadedImages = [];

    for (const file of files) {
      const ext = path.extname(file.originalname) || ".jpg";
      const storageKey = `${galleryId}/${crypto.randomUUID()}${ext}`;
      const destDir = path.join(UPLOADS_DIR, String(galleryId));
      await fs.mkdir(destDir, { recursive: true });
      const destPath = path.join(destDir, path.basename(storageKey));
      await fs.writeFile(destPath, file.buffer);

      const [image] = await db
        .insert(galleryImages)
        .values({
          galleryId,
          filename: path.basename(storageKey),
          originalName: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          fileSize: file.size,
          width: null,
          height: null,
        })
        .returning();

      uploadedImages.push(image);
    }

    res.status(201).json({ images: uploadedImages });
  } catch (error) {
    next(error);
  }
});

// GET /api/galleries/:id/images — list images in gallery
galleriesRouter.get("/:id/images", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const galleryId = Number(req.params.id);

    if (isNaN(galleryId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid gallery ID" },
      });
    }

    const gallery = await verifyGalleryOwnership(galleryId, vendorId);
    if (!gallery) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Gallery not found" },
      });
    }

    const images = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.galleryId, galleryId))
      .orderBy(galleryImages.sortOrder, galleryImages.createdAt);

    res.json({ images });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/galleries/:id/images/:imageId — delete image
galleriesRouter.delete(
  "/:id/images/:imageId",
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vendorId = req.vendor!.id;
      const galleryId = Number(req.params.id);
      const imageId = Number(req.params.imageId);

      if (isNaN(galleryId) || isNaN(imageId)) {
        return res.status(400).json({
          error: { name: "ValidationError", message: "Invalid gallery or image ID" },
        });
      }

      const gallery = await verifyGalleryOwnership(galleryId, vendorId);
      if (!gallery) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Gallery not found" },
        });
      }

      const [image] = await db
        .select()
        .from(galleryImages)
        .where(
          and(eq(galleryImages.id, imageId), eq(galleryImages.galleryId, galleryId)),
        )
        .limit(1);

      if (!image) {
        return res.status(404).json({
          error: { name: "NotFound", message: "Image not found" },
        });
      }

      // Delete file from disk
      const filePath = path.join(UPLOADS_DIR, image.storageKey);
      await fs.unlink(filePath).catch(() => {});

      await db.delete(galleryImages).where(eq(galleryImages.id, imageId));

      res.json({ message: "Image deleted" });
    } catch (error) {
      next(error);
    }
  },
);