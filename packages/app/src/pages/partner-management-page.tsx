import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type {
  PartnerConnection,
  VendorSearchResult,
} from "@/lib/types";
import toast from "react-hot-toast";
import { Card, Badge, Button, EmptyState, PageHeader, Input } from "@/components/ui";
import { Users, UserPlus, UserCheck, UserX, Search, MessageSquare, X, Check } from "lucide-react";

export default function PartnerManagementPage() {
  const [connections, setConnections] = useState<PartnerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VendorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  const fetchConnections = async () => {
    try {
      const data = await api<{ connections: PartnerConnection[] }>(
        "/vendor-partners",
      );
      setConnections(data.connections);
    } catch {
      toast.error("Failed to load partner connections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const data = await api<{ vendors: VendorSearchResult[] }>(
        `/vendor-partners/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(data.vendors);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toVendorId: number) => {
    try {
      await api("/vendor-partners/request", {
        method: "POST",
        body: { toVendorId, message: message || undefined },
      });
      toast.success("Partnership request sent!");
      setMessage("");
      setSearchResults([]);
      setSearchQuery("");
      fetchConnections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    }
  };

  const handleRespond = async (
    connectionId: number,
    status: "accepted" | "rejected",
  ) => {
    try {
      await api(`/vendor-partners/${connectionId}`, {
        method: "PUT",
        body: { status },
      });
      toast.success(
        status === "accepted"
          ? "Partnership accepted!"
          : "Partnership rejected",
      );
      fetchConnections();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to respond",
      );
    }
  };

  const handleRemove = async (connectionId: number) => {
    try {
      await api(`/vendor-partners/${connectionId}`, {
        method: "DELETE",
      });
      toast.success("Connection removed");
      fetchConnections();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove connection",
      );
    }
  };

  const accepted = connections.filter((c) => c.status === "accepted");
  const incoming = connections.filter(
    (c) => c.status === "pending" && c.isIncoming,
  );
  const sent = connections.filter(
    (c) => c.status === "pending" && !c.isIncoming,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader title="Partner Management" />

      {/* Find Partners */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Find Partners
        </h2>
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, email, or business name..."
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={searching || searchQuery.length < 2}
            loading={searching}
          >
            <Search className="w-4 h-4 mr-2" />
            {searching ? "Searching..." : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {v.businessName || v.name}
                  </p>
                  <p className="text-xs text-gray-500">{v.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(v.id)}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Send Request
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <EmptyState
            icon={Users}
            title="No vendors found"
            description="Try a different search term"
          />
        )}
      </Card>

      {/* Your Partners */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Partners ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No partners yet"
            description="Search for vendors to connect."
          />
        ) : (
          <div className="space-y-2">
            {accepted.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {conn.otherVendor?.businessName ||
                      conn.otherVendor?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conn.otherVendor?.email}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(conn.id)}
                >
                  <UserX className="w-4 h-4 mr-1.5" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pending Requests (Incoming) */}
      {incoming.length > 0 && (
        <Card className="p-6 border-yellow-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Requests ({incoming.length})
          </h2>
          <div className="space-y-2">
            {incoming.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {conn.otherVendor?.businessName ||
                      conn.otherVendor?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conn.otherVendor?.email}
                  </p>
                  {conn.message && (
                    <p className="text-xs text-gray-600 mt-1 italic flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      &ldquo;{conn.message}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRespond(conn.id, "accepted")}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRespond(conn.id, "rejected")}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sent Requests */}
      {sent.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sent Requests ({sent.length})
          </h2>
          <div className="space-y-2">
            {sent.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {conn.otherVendor?.businessName ||
                      conn.otherVendor?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conn.otherVendor?.email}
                  </p>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(conn.id)}
                >
                  <UserX className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}