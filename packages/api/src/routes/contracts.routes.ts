import { Router } from "express";
import { db } from "../db.js";
import { contracts, clients } from "@weddingos/db";
import { eq, and } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { sendTransactional } from "../lib/mail.js";
import { absUrl } from "../lib/site-url.js";

export const contractsRouter = Router();

contractsRouter.use(requireAuth);

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

// Helper: get client for a contract
async function getClientForContract(
  contractId: number,
  vendorId: number,
) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(eq(contracts.id, contractId), eq(contracts.vendorId, vendorId)),
    )
    .limit(1);
  if (!contract) return null;
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, contract.clientId))
    .limit(1);
  return client || null;
}

// Helper: verify contract ownership
async function verifyContractOwnership(contractId: number, vendorId: number) {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(
      and(eq(contracts.id, contractId), eq(contracts.vendorId, vendorId)),
    )
    .limit(1);
  return contract || null;
}

// GET /api/contracts/:clientId — list contracts for client
contractsRouter.get("/:clientId", async (req: AuthenticatedRequest, res, next) => {
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
      .from(contracts)
      .where(
        and(
          eq(contracts.clientId, clientId),
          eq(contracts.vendorId, vendorId),
        ),
      )
      .orderBy(contracts.createdAt);

    res.json({ contracts: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/:clientId — create contract
contractsRouter.post("/:clientId", async (req: AuthenticatedRequest, res, next) => {
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

    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "title and content are required",
        },
      });
    }

    const [contract] = await db
      .insert(contracts)
      .values({
        vendorId,
        clientId,
        title,
        content,
        status: "draft",
      })
      .returning();

    res.status(201).json({ contract });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/contracts/:id — update contract
contractsRouter.patch("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const contractId = Number(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid contract ID" },
      });
    }

    const contract = await verifyContractOwnership(contractId, vendorId);
    if (!contract) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Contract not found" },
      });
    }

    const { title, content } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    const [updated] = await db
      .update(contracts)
      .set(updateData)
      .where(eq(contracts.id, contractId))
      .returning();

    res.json({ contract: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/:id/send — mark as sent
contractsRouter.post("/:id/send", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const contractId = Number(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid contract ID" },
      });
    }

    const contract = await verifyContractOwnership(contractId, vendorId);
    if (!contract) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Contract not found" },
      });
    }

    const [updated] = await db
      .update(contracts)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(contracts.id, contractId))
      .returning();

    // Send email notification to client
    try {
      const client = await getClientForContract(contractId, vendorId);
      if (client) {
        await sendTransactional({
          to: client.email,
          subject: `Contract: ${contract.title} from WeddingOS`,
          text: `Hello ${client.name},\n\nA contract is ready for your review.\n\nContract: ${contract.title}\n\nPlease review and sign at: ${absUrl(`/api/contracts/${contractId}/sign`)}\n\nThank you!`,
        });
      }
    } catch {
      // Email send failed — contract is still marked as sent
    }

    res.json({ contract: updated, message: "Contract marked as sent" });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts/:id/sign — record signature
contractsRouter.post("/:id/sign", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const contractId = Number(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid contract ID" },
      });
    }

    const contract = await verifyContractOwnership(contractId, vendorId);
    if (!contract) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Contract not found" },
      });
    }

    const { signatureData } = req.body;

    if (!signatureData) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "signatureData is required",
        },
      });
    }

    const [updated] = await db
      .update(contracts)
      .set({
        status: "signed",
        signedAt: new Date(),
        signatureData,
      })
      .where(eq(contracts.id, contractId))
      .returning();

    // Notify vendor that contract was signed
    try {
      const client = await getClientForContract(contractId, vendorId);
      if (client) {
        await sendTransactional({
          to: req.vendor!.email,
          subject: `Contract signed: ${contract.title}`,
          text: `Great news! ${client.name} has signed the contract "${contract.title}".\n\nView details in your WeddingOS dashboard.`,
        });
      }
    } catch {
      // Email send failed — contract is still signed
    }

    res.json({ contract: updated, message: "Contract signed" });
  } catch (error) {
    next(error);
  }
});