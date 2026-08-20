import { useState, useEffect } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";

interface AdminStats {
  totalVendors: number;
  totalClients: number;
  totalInvoices: number;
  paidInvoices: number;
  totalRevenueCents: number;
  totalContracts: number;
  activeVendors: number;
}

interface RecentVendor {
  id: number;
  name: string;
  email: string;
  businessName: string | null;
  createdAt: string | null;
}

interface DashboardData {
  stats: AdminStats;
  recentVendors: RecentVendor[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const stats = data?.stats;

  const statCards = [
    { label: "Total Vendors", value: stats?.totalVendors ?? 0, color: "bg-indigo-500" },
    { label: "Active Vendors", value: stats?.activeVendors ?? 0, color: "bg-green-500" },
    { label: "Total Clients", value: stats?.totalClients ?? 0, color: "bg-blue-500" },
    { label: "Total Invoices", value: stats?.totalInvoices ?? 0, color: "bg-purple-500" },
    { label: "Paid Invoices", value: stats?.paidInvoices ?? 0, color: "bg-emerald-500" },
    { label: "Revenue", value: formatCents(stats?.totalRevenueCents ?? 0), color: "bg-amber-500" },
    { label: "Total Contracts", value: stats?.totalContracts ?? 0, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Admin Dashboard</h1>
        <p className="mt-1 text-gray-400">Platform overview at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-800 rounded-xl border border-gray-700 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${card.color}`} />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-100">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vendors */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              Recent Vendors
            </h2>
            <Link
              href="/admin/vendors"
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View all
            </Link>
          </div>
          {data?.recentVendors && data.recentVendors.length > 0 ? (
            <div className="space-y-2">
              {data.recentVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/admin/vendors`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-100">
                      {vendor.name}
                    </p>
                    <p className="text-xs text-gray-400">{vendor.email}</p>
                  </div>
                  {vendor.businessName && (
                    <span className="text-xs text-gray-400">
                      {vendor.businessName}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No vendors registered yet</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/vendors"
              className="p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <p className="text-sm font-medium text-gray-100">
                Manage Vendors
              </p>
              <p className="text-xs text-gray-400 mt-1">
                View and manage all vendors
              </p>
            </Link>
            <Link
              href="/admin/settings"
              className="p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <p className="text-sm font-medium text-gray-100">
                Platform Settings
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Configure platform settings
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}