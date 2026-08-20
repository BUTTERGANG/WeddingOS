import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Invoice, InvoiceLineItem } from "@/lib/types";
import { Plus, CreditCard, Trash2, Eye, FileText } from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";

interface InvoicesPageProps {
  clientId: string;
}

function LineItemRow({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: { description: string; quantity: number; unitPrice: number };
  index: number;
  onChange: (i: number, field: string, value: string | number) => void;
  onRemove: (i: number) => void;
}) {
  const total = (item.quantity || 0) * (item.unitPrice || 0);
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <input
          value={item.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="w-16">
        <label className="block text-xs text-gray-500 mb-1">Qty</label>
        <input
          type="number"
          min={1}
          value={item.quantity}
          onChange={(e) => onChange(index, "quantity", parseInt(e.target.value) || 0)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs text-gray-500 mb-1">Unit Price ($)</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={item.unitPrice}
          onChange={(e) => onChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
        />
      </div>
      <div className="w-20 text-right">
        <label className="block text-xs text-gray-500 mb-1">Total</label>
        <p className="py-1.5 text-sm font-medium">${total.toFixed(2)}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1.5 text-gray-400 hover:text-red-500 mb-1"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info" | "purple"> = {
  draft: "default",
  sent: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "default",
  refunded: "purple",
};

export default function InvoicesPage({ clientId }: InvoicesPageProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Invoice form
  const [lineItems, setLineItems] = useState<
    { description: string; quantity: number; unitPrice: number }[]
  >([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [dueDate, setDueDate] = useState("");

  const fetchInvoices = () => {
    api<Invoice[]>(`/clients/${clientId}/invoices`)
      .then(setInvoices)
      .catch(() => toast.error("Failed to load invoices"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [clientId]);

  const grandTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const itemsWithTotals = lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: Math.round(item.unitPrice * 100),
      totalCents: Math.round(item.quantity * item.unitPrice * 100),
    }));

    const totalCents = itemsWithTotals.reduce((sum, i) => sum + i.totalCents, 0);

    try {
      await api(`/clients/${clientId}/invoices`, {
        method: "POST",
        body: {
          clientId: parseInt(clientId),
          amountCents: totalCents,
          dueDate: dueDate || null,
          lineItems: itemsWithTotals,
        },
      });
      toast.success("Invoice created");
      setShowAdd(false);
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setDueDate("");
      fetchInvoices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const markPaid = async (id: number) => {
    try {
      await api(`/invoices/${id}`, { method: "PUT", body: { status: "paid" } });
      toast.success("Invoice marked as paid");
      fetchInvoices();
    } catch {
      toast.error("Failed to update invoice");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/clients/${clientId}`} className="text-sm text-gray-400 hover:text-gray-600">
              Client
            </Link>
            <span className="text-gray-300">/</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">{invoices.length} invoices</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Invoice
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice to bill your client"
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {inv.invoiceNumber}
                  </h3>
                  <Badge variant={STATUS_VARIANT[inv.status] || "default"}>
                    {inv.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  ${(inv.amountCents / 100).toLocaleString()}
                  {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
                </p>
              </div>
              {inv.status === "sent" && (
                <Button variant="secondary" size="sm" onClick={() => markPaid(inv.id)}>
                  <CreditCard className="w-4 h-4 mr-1" />
                  Mark Paid
                </Button>
              )}
              {inv.status === "draft" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api(`/invoices/${inv.id}`, { method: "PUT", body: { status: "sent" } });
                      toast.success("Invoice sent");
                      fetchInvoices();
                    } catch {
                      toast.error("Failed to send invoice");
                    }
                  }}
                >
                  Mark Sent
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create invoice modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Line Items</h3>
                  <button type="button" onClick={addLineItem} className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {lineItems.map((item, i) => (
                  <LineItemRow
                    key={i}
                    item={item}
                    index={i}
                    onChange={updateLineItem}
                    onRemove={removeLineItem}
                  />
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <p className="text-lg font-bold text-gray-900">
                  Total: ${grandTotal.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <Button type="submit" disabled={lineItems.some((i) => !i.description)} className="flex-1">
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  Create Invoice (${grandTotal.toFixed(2)})
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}