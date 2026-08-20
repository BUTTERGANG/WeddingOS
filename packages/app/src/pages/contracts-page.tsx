import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Contract } from "@/lib/types";

interface ContractsPageProps {
  clientId: string;
}

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
};

export default function ContractsPage({ clientId }: ContractsPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  // Sign form
  const [signName, setSignName] = useState("");
  const [signDate, setSignDate] = useState("");

  const fetchContracts = () => {
    api<Contract[]>(`/clients/${clientId}/contracts`)
      .then(setContracts)
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
      await api(`/clients/${clientId}/contracts`, {
        method: "POST",
        body: {
          clientId: parseInt(clientId),
          title: formTitle,
          content: formContent,
        },
      });
      toast.success("Contract created");
      setShowAdd(false);
      resetForm();
      fetchContracts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create contract");
    }
  };

  const sendContract = async (contract: Contract) => {
    try {
      await api(`/contracts/${contract.id}`, {
        method: "PUT",
        body: { status: "sent" },
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
      await api(`/contracts/${viewingContract.id}`, {
        method: "PUT",
        body: {
          status: "signed",
          signatureData: { name: signName, date: signDate },
        },
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
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          New Contract
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No contracts yet</p>
        </div>
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
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGES[contract.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {contract.status}
                  </span>
                </div>
                {contract.signedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Signed {new Date(contract.signedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingContract(contract)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  View
                </button>
                {contract.status === "draft" && (
                  <button
                    onClick={() => sendContract(contract)}
                    className="px-3 py-1.5 text-sm font-medium bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors"
                  >
                    Send
                  </button>
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
                <input required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Photography Services Agreement" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Content
                  <span className="text-gray-400 font-normal ml-1">
                    (Use {'{clientName}'}, {'{partnerName}'}, {'{weddingDate}'}, {'{venue}'} as merge fields)
                  </span>
                </label>
                <textarea
                  required
                  rows={15}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={`SERVICES AGREEMENT\n\nThis Agreement is made between {businessName} and {clientName} & {partnerName} for wedding photography services on {weddingDate} at {venue}.\n\n...`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">Create Contract</button>
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
              <button onClick={() => setViewingContract(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm text-gray-800">
                {viewingContract.content}
              </div>

              {viewingContract.status === "signed" && viewingContract.signatureData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Signed by {String(viewingContract.signatureData.name)} on{" "}
                    {String(viewingContract.signatureData.date)}
                  </p>
                </div>
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
                  <button type="submit" className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                    Sign Contract
                  </button>
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