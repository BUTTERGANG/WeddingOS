import { Router } from "express";
import { db } from "../db.js";
import { contracts, clients, invoices } from "@weddingos/db";
import { eq, and, desc } from "drizzle-orm";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { sendTransactional } from "../lib/mail.js";
import { absUrl } from "../lib/site-url.js";
import { jsPDF } from "jspdf";

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

// Helper: resolve merge fields in contract content using client + vendor data
async function resolveMergeFields(
  content: string,
  clientId: number,
  vendorInfo: { id: number; name: string; businessName: string | null },
): Promise<string> {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.vendorId, vendorInfo.id)))
    .limit(1);
  if (!client) return content;

  // Get latest invoice for {amount} merge field
  let amountStr = "$0.00";
  try {
    const [latestInvoice] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.clientId, clientId), eq(invoices.vendorId, vendorInfo.id)),
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    if (latestInvoice) {
      amountStr = `$${(latestInvoice.amountCents / 100).toFixed(2)}`;
    }
  } catch {
    // If invoice lookup fails, leave amount at $0.00
  }

  return content
    .replace(/\{clientName\}/g, client.name)
    .replace(/\{clientEmail\}/g, client.email)
    .replace(/\{weddingDate\}/g, client.weddingDate || "TBD")
    .replace(/\{venue\}/g, client.venue || "TBD")
    .replace(/\{partnerName\}/g, client.partnerName || "TBD")
    .replace(/\{vendorName\}/g, vendorInfo.businessName || vendorInfo.name)
    .replace(/\{amount\}/g, amountStr);
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

// POST /api/contracts/:clientId — create contract with merge field resolution
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

    const { title, content, rawContent } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: {
          name: "ValidationError",
          message: "title and content are required",
        },
      });
    }

    // Resolve merge fields before saving — server replaces them with actual data
    const resolvedContent = await resolveMergeFields(content, clientId, {
      id: req.vendor!.id,
      name: req.vendor!.name,
      businessName: req.vendor!.businessName,
    });

    // If rawContent is provided, save it as-is for template editing; otherwise
    // the resolved content becomes the saved content (no re-editing of fields)
    const [contract] = await db
      .insert(contracts)
      .values({
        vendorId,
        clientId,
        title,
        content: resolvedContent,
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

// POST /api/contracts/:id/pdf — generate signed PDF
contractsRouter.post("/:id/pdf", async (req: AuthenticatedRequest, res, next) => {
  try {
    const vendorId = req.vendor!.id;
    const contractId = Number(req.params.id);

    if (isNaN(contractId)) {
      return res.status(400).json({
        error: { name: "ValidationError", message: "Invalid contract ID" },
      });
    }

    // 1. Verify vendor owns the contract
    const contract = await verifyContractOwnership(contractId, vendorId);
    if (!contract) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Contract not found" },
      });
    }

    // 2. Look up the client
    const client = await getClientForContract(contractId, vendorId);
    if (!client) {
      return res.status(404).json({
        error: { name: "NotFound", message: "Client not found" },
      });
    }

    // Vendor info from auth
    const vendor = req.vendor!;

    // 3. Generate PDF with jsPDF
    const doc = new jsPDF({ format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(contract.title, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 8 + 8;

    // Horizontal rule
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Vendor info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Vendor", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(vendor.businessName || vendor.name, margin, y);
    y += 5;
    doc.text(vendor.email, margin, y);
    if (vendor.phone) {
      y += 5;
      doc.text(vendor.phone, margin, y);
    }
    y += 12;

    // Client info
    doc.setFont("helvetica", "bold");
    doc.text("Client", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(client.name, margin, y);
    y += 5;
    doc.text(client.email, margin, y);
    if (client.partnerName) {
      y += 5;
      doc.text(`Partner: ${client.partnerName}`, margin, y);
    }
    if (client.weddingDate) {
      y += 5;
      doc.text(`Wedding Date: ${client.weddingDate}`, margin, y);
    }
    if (client.venue) {
      y += 5;
      doc.text(`Venue: ${client.venue}`, margin, y);
    }
    y += 12;

    // Horizontal rule
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Contract content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const contentLines = doc.splitTextToSize(contract.content, contentWidth);
    for (const line of contentLines) {
      // Check if we need a new page
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 6;
    }

    // 5. If signed: signature overlay
    if (contract.status === "signed" && contract.signatureData) {
      y = Math.max(y + 15, 230);

      // Horizontal rule above signature
      doc.setDrawColor(150, 200, 150);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 120, 34);
      doc.text("SIGNED", margin, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      const sigData = contract.signatureData as Record<string, unknown>;
      const signedName = String(sigData.name || "N/A");
      const signedDate = String(sigData.date || new Date().toISOString().split("T")[0]);
      const signedBy = String(sigData.email || client.email);
      const signedIp = String(sigData.ip || "");

      doc.setFont("helvetica", "bold");
      doc.text(`Signed by: `, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(signedName, margin + 30, y);
      y += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`Date: `, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(signedDate, margin + 30, y);
      y += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`Email: `, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(signedBy, margin + 30, y);

      if (signedIp) {
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.text(`IP: `, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(signedIp, margin + 30, y);
      }
    }

    // 4. Return PDF as download
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const filename = `${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});