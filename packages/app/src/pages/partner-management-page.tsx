import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type {
  PartnerConnection,
  VendorSearchResult,
} from "@/lib/types";
import toast from "react-hot-toast";

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
      <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>

      {/* Find Partners */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Find Partners
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, email, or business name..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching || searchQuery.length < 2}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search"}
          </button>
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
                <button
                  onClick={() => handleSendRequest(v.id)}
                  className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  Send Request
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <p className="text-sm text-gray-500">No vendors found</p>
        )}
      </section>

      {/* Your Partners */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Partners ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-gray-500">
            No partners yet. Search for vendors to connect.
          </p>
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
                <button
                  onClick={() => handleRemove(conn.id)}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Requests (Incoming) */}
      {incoming.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
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
                    <p className="text-xs text-gray-600 mt-1 italic">
                      "{conn.message}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(conn.id, "accepted")}
                    className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(conn.id, "rejected")}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent Requests */}
      {sent.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
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
                  <p className="text-xs text-gray-400 mt-1">Pending</p>
                </div>
                <button
                  onClick={() => handleRemove(conn.id)}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}