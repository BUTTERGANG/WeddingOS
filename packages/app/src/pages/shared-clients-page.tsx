import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { SharedClient, Client, PartnerConnection } from "@/lib/types";
import toast from "react-hot-toast";

interface SharedClientIncoming extends SharedClient {
  ownerVendor: {
    id: number;
    name: string;
    email: string;
    businessName: string | null;
  } | null;
}

interface SharedClientOutgoing extends SharedClient {
  vendorId: number;
  partnerVendor: {
    id: number;
    name: string;
    email: string;
    businessName: string | null;
  } | null;
}

interface PartnersResponse {
  connections: PartnerConnection[];
}

interface ClientsResponse {
  clients: Client[];
}

interface SharedClientsResponse {
  incoming: SharedClientIncoming[];
  outgoing: SharedClientOutgoing[];
}

export default function SharedClientsPage() {
  const [sharedData, setSharedData] = useState<SharedClientsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [myClients, setMyClients] = useState<Client[]>([]);
  const [partners, setPartners] = useState<PartnerConnection[]>([]);

  // Share form state
  const [showShareForm, setShowShareForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("read");
  const [sharing, setSharing] = useState(false);

  const fetchData = async () => {
    try {
      const [shared, clientData, partnerData] = await Promise.all([
        api<SharedClientsResponse>("/shared-clients"),
        api<ClientsResponse>("/clients"),
        api<PartnersResponse>("/vendor-partners"),
      ]);
      setSharedData(shared);
      setMyClients(clientData.clients);
      setPartners(
        partnerData.connections.filter((c) => c.status === "accepted"),
      );
    } catch {
      toast.error("Failed to load shared clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleShare = async () => {
    const clientId = Number(selectedClientId);
    const vendorId = Number(selectedPartnerId);
    if (!clientId || !vendorId) {
      toast.error("Please select a client and a partner");
      return;
    }

    setSharing(true);
    try {
      await api("/shared-clients", {
        method: "POST",
        body: {
          clientId,
          vendorId,
          permission: selectedPermission,
        },
      });
      toast.success("Client shared!");
      setShowShareForm(false);
      setSelectedClientId("");
      setSelectedPartnerId("");
      setSelectedPermission("read");
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to share client",
      );
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (shareId: number) => {
    try {
      await api(`/shared-clients/${shareId}`, {
        method: "DELETE",
      });
      toast.success("Access revoked");
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke access",
      );
    }
  };

  const handleChangePermission = async (
    shareId: number,
    permission: string,
  ) => {
    try {
      await api(`/shared-clients/${shareId}`, {
        method: "PUT",
        body: { permission },
      });
      toast.success("Permission updated");
      fetchData();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update permission",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shared Clients</h1>
        <button
          onClick={() => setShowShareForm(!showShareForm)}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          {showShareForm ? "Cancel" : "Share a Client"}
        </button>
      </div>

      {/* Share Form */}
      {showShareForm && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Share a Client with a Partner
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a client...</option>
                {myClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Partner
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a partner...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.otherVendor?.id}>
                    {p.otherVendor?.businessName || p.otherVendor?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permission Level
              </label>
              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="read">Read only</option>
                <option value="write">Read + Write</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
            <button
              onClick={handleShare}
              disabled={
                sharing || !selectedClientId || !selectedPartnerId
              }
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {sharing ? "Sharing..." : "Share Client"}
            </button>
          </div>
        </section>
      )}

      {/* Shared with me (incoming) */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Shared with Me ({sharedData?.incoming.length ?? 0})
        </h2>
        {!sharedData?.incoming.length ? (
          <p className="text-sm text-gray-500">
            No clients have been shared with you yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sharedData.incoming.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sc.client?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Shared by:{" "}
                    {sc.ownerVendor?.businessName || sc.ownerVendor?.name}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                      sc.permission === "read"
                        ? "bg-blue-100 text-blue-700"
                        : sc.permission === "write"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {sc.permission}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My shared clients (outgoing) */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Shared Clients ({sharedData?.outgoing.length ?? 0})
        </h2>
        {!sharedData?.outgoing.length ? (
          <p className="text-sm text-gray-500">
            You haven't shared any clients yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sharedData.outgoing.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {sc.client?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Shared with:{" "}
                    {sc.partnerVendor?.businessName ||
                      sc.partnerVendor?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        sc.permission === "read"
                          ? "bg-blue-100 text-blue-700"
                          : sc.permission === "write"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {sc.permission}
                    </span>
                    <select
                      value={sc.permission}
                      onChange={(e) =>
                        handleChangePermission(sc.id, e.target.value)
                      }
                      className="text-xs border border-gray-300 rounded px-1 py-0.5"
                    >
                      <option value="read">Read</option>
                      <option value="write">Write</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(sc.id)}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}