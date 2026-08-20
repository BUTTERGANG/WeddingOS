import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import type { ExtendedVendor, MarketplaceListResponse } from "@/lib/types";
import { Card, Badge, EmptyState, Skeleton, Input, LoadingSpinner } from "@/components/ui";
import { Search, MapPin, Filter, Grid, ChevronDown } from "lucide-react";

const SERVICE_CATEGORIES = [
  "Photography",
  "Videography",
  "Catering",
  "Florist",
  "Venue",
  "Music & Entertainment",
  "Wedding Planning",
  "Hair & Makeup",
  "Cakes & Desserts",
  "Invitations & Stationery",
  "Transportation",
  "Officiant",
  "Rentals & Decor",
  "Attire & Fashion",
];

export default function MarketplaceDirectory() {
  const [vendors, setVendors] = useState<ExtendedVendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [service, setService] = useState("");
  const [q, setQ] = useState("");

  // Debounced search
  const [searchInput, setSearchInput] = useState("");

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (city) params.set("city", city);
      if (state) params.set("state", state);
      if (service) params.set("service", service);
      if (searchInput) params.set("q", searchInput);

      const data = await api<MarketplaceListResponse>(
        `/marketplace/vendors?${params.toString()}`,
      );
      setVendors(data.vendors);
      setTotal(data.total);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, city, state, service, searchInput]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchInput(q);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <span className="font-semibold text-gray-900">WeddingOS</span>
              </Link>
            </div>
            <Link
              href="/login"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Vendor Login
            </Link>
          </div>
          <div className="mt-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Find Your Perfect Wedding Vendor
            </h1>
            <p className="mt-2 text-gray-600">
              Browse trusted professionals for your special day
            </p>
          </div>
          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-6">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search vendors or services..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-40"
              />
              <input
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-32"
              />
              <select
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
              >
                <option value="">All Services</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No vendors found"
            description="No vendors found matching your criteria. Try adjusting your filters."
          />
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {total} vendor{total !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/marketplace/${vendor.id}`}
                  className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Profile image placeholder */}
                  <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                    {vendor.profileImage ? (
                      <img
                        src={vendor.profileImage}
                        alt={vendor.businessName || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-brand-300 flex items-center justify-center">
                        <span className="text-2xl text-white font-bold">
                          {(vendor.businessName || "V")[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {vendor.businessName || vendor.name}
                    </h3>
                    {(vendor.city || vendor.state) && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {vendor.serviceCategories && vendor.serviceCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {vendor.serviceCategories.slice(0, 3).map((cat) => (
                          <Badge key={cat} variant="info">{cat}</Badge>
                        ))}
                        {vendor.serviceCategories.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{vendor.serviceCategories.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}