import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { SharedClient, Client, PartnerConnection } from "@/lib/types";
import toast from "react-hot-toast";
import { Card, Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { Users, Share2, Eye, Lock, Check, X, UserPlus } from "lucide-react";

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

  const permissionBadgeVariant = (perm: string) => {
    switch (perm) {
      case "read": return "info";
      case "write": return "warning";
      case "admin": return "purple";
      default: return "default";
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
      <PageHeader
        title="Shared Clients"
        actions={
          <Button
            onClick={() => setShowShareForm(!showShareForm)}
          >
            {showShareForm ? "Cancel" : "Share a Client"}
          </Button>
        }
      />

      {/* Share Form */}
      {showShareForm && (
        <Card className="p-6">
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
                    {c.name} &mdash; {c.email}
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
            <Button
              onClick={handleShare}
              disabled={
                sharing || !selectedClientId || !selectedPartnerId
              }
              loading={sharing}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {sharing ? "Sharing..." : "Share Client"}
            </Button>
          </div>
        </Card>
      )}

      {/* Shared with me (incoming) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Shared with Me ({sharedData?.incoming.length ?? 0})
        </h2>
        {!sharedData?.incoming.length ? (
          <EmptyState
            icon={Eye}
            title="No shared clients"
            description="No clients have been shared with you yet."
          />
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
                  <Badge
                    variant={permissionBadgeVariant(sc.permission)}
                    className="mt-1"
                  >
                    {sc.permission}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My shared clients (outgoing) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Shared Clients ({sharedData?.outgoing.length ?? 0})
        </h2>
        {!sharedData?.outgoing.length ? (
          <EmptyState
            icon={Share2}
            title="No shared clients"
            description="You haven't shared any clients yet."
          />
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
                    <Badge
                      variant={permissionBadgeVariant(sc.permission)}
                    >
                      {sc.permission}
                    </Badge>
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
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevoke(sc.id)}
                >
                  <Lock className="w-4 h-4 mr-1.5" />
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}