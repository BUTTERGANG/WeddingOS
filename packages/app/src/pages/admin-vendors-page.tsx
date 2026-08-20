import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface AdminVendor {
  id: number;
  name: string;
  email: string;
  businessName: string | null;
  businessWebsite: string | null;
  phone: string | null;
  clientCount: number;
  createdAt: string | null;
}

interface VendorListResponse {
  vendors: AdminVendor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface VendorDetail {
  id: number;
  name: string;
  email: string;
  businessName: string | null;
  businessWebsite: string | null;
  phone: string | null;
  stripeAccountId: string | null;
  clientCount: number;
  invoiceCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface VendorStats {
  stats: {
    clients: { total: number; active: number; lead: number; archived: number };
    invoices: { total: number; paid: number; overdue: number; draft: number; revenueCents: number; outstandingCents: number };
    contracts: { total: number; signed: number; draft: number };
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<AdminVendor | null>(null);
  const [vendorDetail, setVendorDetail] = useState<VendorDetail | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchVendors = async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q) params.set("search", q);
      const data = await api<VendorListResponse>(`/admin/vendors?${params}`);
      setVendors(data.vendors);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(page, search);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVendors(1, search);
  };

  const openVendorDetail = async (vendor: AdminVendor) => {
    setSelectedVendor(vendor);
    setDetailLoading(true);
    setVendorDetail(null);
    setVendorStats(null);
    try {
      const [detail, stats] = await Promise.all([
        api<VendorDetail>(`/admin/vendors/${vendor.id}`),
        api<VendorStats>(`/admin/vendors/${vendor.id}/stats`),
      ]);
      setVendorDetail(detail);
      setVendorStats(stats);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCents = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Vendor Management</h1>
        <p className="mt-1 text-gray-400">
          {total} vendor{total !== 1 ? "s" : ""} registered
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors by name, email, or business..."
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Search
        </button>
      </form>

      {/* Vendor Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Business</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Clients</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => openVendorDetail(vendor)}
                  >
                    <td className="px-4 py-3 text-gray-100 font-medium">
                      {vendor.name}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{vendor.email}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {vendor.businessName || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {vendor.clientCount}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {vendor.createdAt
                        ? new Date(vendor.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Vendor Detail Panel */}
      {selectedVendor && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              {selectedVendor.name}
            </h2>
            <button
              onClick={() => {
                setSelectedVendor(null);
                setVendorDetail(null);
                setVendorStats(null);
              }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Close
            </button>
          </div>

          {detailLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendor Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Account Info
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Email</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Business</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.businessName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Website</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.businessWebsite || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Phone</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Clients</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.clientCount ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Invoices</span>
                    <span className="text-gray-100 text-sm">
                      {vendorDetail?.invoiceCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor Stats */}
              {vendorStats && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Client Stats
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-indigo-400">
                        {vendorStats.stats.clients.active}
                      </p>
                      <p className="text-xs text-gray-400">Active</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-yellow-400">
                        {vendorStats.stats.clients.lead}
                      </p>
                      <p className="text-xs text-gray-400">Leads</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-400">
                        {vendorStats.stats.clients.archived}
                      </p>
                      <p className="text-xs text-gray-400">Archived</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider pt-2">
                    Revenue
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-lg font-bold text-green-400">
                        {formatCents(vendorStats.stats.invoices.revenueCents)}
                      </p>
                      <p className="text-xs text-gray-400">Earned</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-lg font-bold text-orange-400">
                        {formatCents(vendorStats.stats.invoices.outstandingCents)}
                      </p>
                      <p className="text-xs text-gray-400">Outstanding</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider pt-2">
                    Contracts
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">
                        {vendorStats.stats.contracts.signed}
                      </p>
                      <p className="text-xs text-gray-400">Signed</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-gray-400">
                        {vendorStats.stats.contracts.draft}
                      </p>
                      <p className="text-xs text-gray-400">Draft</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}