import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Contract } from "@/lib/types";
import { Plus, Eye, Trash2, FileText, Download } from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";

interface ContractsPageProps {
  clientId: string;
}

const STATUS_BADGES: Record<string, "default" | "success" | "danger" | "info" | "warning" | "purple"> = {
  draft: "default",
  sent: "info",
  signed: "success",
  expired: "danger",
};

const MERGE_FIELDS = [
  { field: "{clientName}", desc: "Client's full name" },
  { field: "{clientEmail}", desc: "Client's email" },
  { field: "{weddingDate}", desc: "Wedding date" },
  { field: "{venue}", desc: "Venue name" },
  { field: "{partnerName}", desc: "Partner's name" },
  { field: "{vendorName}", desc: "Your business name" },
  { field: "{amount}", desc: "Invoice amount (from latest invoice)" },
] as const;

export default function ContractsPage({ clientId }: ContractsPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  // Sign form
  const [signName, setSignName] = useState("");
  const [signDate, setSignDate] = useState("");

  const fetchContracts = () => {
    api<{ contracts: Contract[] }>(`/contracts/${clientId}`)
      .then((data) => setContracts(data.contracts))
      .catch(() => toast.error("Failed to load contracts"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContracts();
  }, [clientId]);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/contracts/${clientId}`, {
        method: "POST",
        body: {
          clientId: parseInt(clientId),
          title: formTitle,
          content: formContent,
        },
      });
      toast.success("Contract created with merge fields resolved");
      setShowAdd(false);
      resetForm();
      fetchContracts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create contract");
    }
  };

  const sendContract = async (contract: Contract) => {
    try {
      await api(`/contracts/${contract.id}/send`, {
        method: "POST",
      });
      toast.success("Contract sent to client");
      fetchContracts();
    } catch {
      toast.error("Failed to send contract");
    }
  };

  const signContract = async (e: FormEvent) => {
    e.preventDefault();
    if (!viewingContract) return;
    try {
      const body: Record<string, unknown> = {
        signatureData: {
          name: signName,
          date: signDate,
          email: "", // would come from client in production
        },
      };
      await api(`/contracts/${viewingContract.id}/sign`, {
        method: "POST",
        body,
      });
      toast.success("Contract signed");
      setViewingContract(null);
      setSignName("");
      setSignDate("");
      fetchContracts();
    } catch {
      toast.error("Failed to sign contract");
    }
  };

  const downloadPdf = async (contract: Contract) => {
    setDownloadingPdf(contract.id);
    try {
      // Direct fetch since we need blob response, not JSON
      const res = await fetch(`/api/contracts/${contract.id}/pdf`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const insertMergeField = (field: string) => {
    setFormContent((prev) => prev + field);
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
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="mt-1 text-sm text-gray-500">{contracts.length} contracts</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Contract
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts yet"
          description="Create your first contract to formalize agreements with clients"
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{contract.title}</h3>
                  <Badge variant={STATUS_BADGES[contract.status] || "default"}>
                    {contract.status}
                  </Badge>
                </div>
                {contract.signedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Signed {new Date(contract.signedAt).toLocaleDateString()}
                  </p>
                )}
                {contract.sentAt && !contract.signedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Sent {new Date(contract.sentAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewingContract(contract)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                {contract.status === "draft" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => sendContract(contract)}
                  >
                    Send
                  </Button>
                )}
                {contract.status === "signed" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadPdf(contract)}
                    disabled={downloadingPdf === contract.id}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {downloadingPdf === contract.id ? "Downloading..." : "Download PDF"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create contract modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Contract</h2>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Photography Services Agreement"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Content
                </label>
                {/* Merge field hints */}
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-1.5">Available merge fields — click to insert:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_FIELDS.map(({ field, desc }) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => insertMergeField(field)}
                        title={desc}
                        className="text-xs px-2 py-1 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-mono"
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600 mt-1.5">
                    Merge fields are replaced with actual client data when saving
                  </p>
                </div>
                <textarea
                  required
                  rows={15}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={`SERVICES AGREEMENT\n\nThis Agreement is made between {vendorName} and {clientName} & {partnerName} for wedding services on {weddingDate} at {venue}.\n\nTotal Fee: {amount}\n\n...`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <Button type="submit" className="flex-1">
                  <FileText className="w-4 h-4 mr-1.5" />
                  Create Contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Sign contract modal */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{viewingContract.title}</h2>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGES[viewingContract.status] || "default"}>
                  {viewingContract.status}
                </Badge>
                <button onClick={() => setViewingContract(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm text-gray-800">
                {viewingContract.content}
              </div>

              {viewingContract.status === "signed" && viewingContract.signatureData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Signed by {String((viewingContract.signatureData as Record<string, unknown>).name || "N/A")} on{" "}
                    {String((viewingContract.signatureData as Record<string, unknown>).date || "N/A")}
                  </p>
                </div>
              )}

              {viewingContract.status === "signed" && (
                <Button
                  onClick={() => downloadPdf(viewingContract)}
                  disabled={downloadingPdf === viewingContract.id}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  {downloadingPdf === viewingContract.id ? "Downloading PDF..." : "Download Signed PDF"}
                </Button>
              )}

              {viewingContract.status === "sent" && (
                <form onSubmit={signContract} className="border-t border-gray-200 pt-4 space-y-3">
                  <h3 className="font-medium text-gray-900">Sign this Contract</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                      <input required value={signName} onChange={(e) => setSignName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Date</label>
                      <input type="date" required value={signDate} onChange={(e) => setSignDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Sign Contract
                  </Button>
                </form>
              )}

              {viewingContract.status === "draft" && (
                <div className="text-center text-sm text-gray-400">
                  Send this contract to the client to begin the signing process.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}