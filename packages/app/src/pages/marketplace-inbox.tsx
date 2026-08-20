import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { VendorInquiry, VendorInquiryStats } from "@/lib/types";
import toast from "react-hot-toast";

const STATUS_TABS = ["all", "new", "read", "replied", "archived"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function MarketplaceInbox() {
  const [inquiries, setInquiries] = useState<VendorInquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusTab>("all");

  const [stats, setStats] = useState<VendorInquiryStats>({
    stats: { new: 0, read: 0, replied: 0, archived: 0 },
    total: 0,
  });

  // Detail modal
  const [selectedInquiry, setSelectedInquiry] = useState<VendorInquiry | null>(
    null,
  );

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filterStatus !== "all") params.set("status", filterStatus);

      const data = await api<{
        inquiries: VendorInquiry[];
        total: number;
        page: number;
        limit: number;
      }>(`/vendor/marketplace/inquiries?${params.toString()}`);
      setInquiries(data.inquiries);
      setTotal(data.total);
    } catch {
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api<VendorInquiryStats>(
        "/vendor/marketplace/inquiries/stats",
      );
      setStats(data);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [page, filterStatus]);

  const handleViewInquiry = async (inquiry: VendorInquiry) => {
    if (inquiry.status === "new") {
      try {
        const data = await api<{ inquiry: VendorInquiry }>(
          `/vendor/marketplace/inquiries/${inquiry.id}`,
        );
        setSelectedInquiry(data.inquiry);
        // Refresh list to reflect read status
        fetchInquiries();
        fetchStats();
        return;
      } catch {
        // fall back to local
      }
    }
    setSelectedInquiry(inquiry);
  };

  const handleUpdateStatus = async (
    inquiryId: number,
    status: string,
  ) => {
    try {
      await api(`/vendor/marketplace/inquiries/${inquiryId}`, {
        method: "PUT",
        body: { status },
      });
      toast.success(`Marked as ${status}`);
      setSelectedInquiry(null);
      fetchInquiries();
      fetchStats();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-gray-500 mt-1">
          Leads and messages from couples browsing the marketplace
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {STATUS_TABS.map((status) => {
          const count =
            status === "all"
              ? stats.total
              : stats.stats[status] || 0;
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setPage(1);
              }}
              className={`p-4 rounded-xl border text-left transition-colors ${
                isActive
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 capitalize">
                {status === "all" ? "Total" : status}
              </p>
            </button>
          );
        })}
      </div>

      {/* Inquiries table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No inquiries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    onClick={() => handleViewInquiry(inquiry)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      inquiry.status === "new" ? "bg-brand-50/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {inquiry.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inquiry.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inquiry.serviceInterest || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {inquiry.createdAt
                        ? new Date(inquiry.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          inquiry.status === "new"
                            ? "bg-blue-100 text-blue-700"
                            : inquiry.status === "read"
                              ? "bg-gray-100 text-gray-700"
                              : inquiry.status === "replied"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {inquiry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedInquiry.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedInquiry.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {selectedInquiry.phone && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">
                      Phone
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedInquiry.phone}
                    </p>
                  </div>
                )}
                {selectedInquiry.weddingDate && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">
                      Wedding Date
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedInquiry.weddingDate}
                    </p>
                  </div>
                )}
                {selectedInquiry.venue && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">
                      Venue
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedInquiry.venue}
                    </p>
                  </div>
                )}
                {selectedInquiry.serviceInterest && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">
                      Service Interest
                    </span>
                    <p className="text-sm text-gray-900">
                      {selectedInquiry.serviceInterest}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Message
                  </span>
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Received
                  </span>
                  <p className="text-sm text-gray-900">
                    {selectedInquiry.createdAt
                      ? new Date(
                          selectedInquiry.createdAt,
                        ).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">
                    Current Status
                  </span>
                  <span
                    className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      selectedInquiry.status === "new"
                        ? "bg-blue-100 text-blue-700"
                        : selectedInquiry.status === "read"
                          ? "bg-gray-100 text-gray-700"
                          : selectedInquiry.status === "replied"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedInquiry.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                {selectedInquiry.status !== "replied" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry.id, "replied")
                    }
                    className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Mark as Replied
                  </button>
                )}
                {selectedInquiry.status !== "archived" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry.id, "archived")
                    }
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Archive
                  </button>
                )}
                {selectedInquiry.status === "archived" && (
                  <button
                    onClick={() =>
                      handleUpdateStatus(selectedInquiry.id, "read")
                    }
                    className="px-4 py-2 text-sm bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200"
                  >
                    Unarchive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}