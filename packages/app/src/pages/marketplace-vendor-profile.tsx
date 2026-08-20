import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "wouter";
import { api } from "@/lib/api";
import type { ExtendedVendor, VendorInquiry } from "@/lib/types";
import toast from "react-hot-toast";
import { Card, Badge, Button, Input, Select, EmptyState, LoadingSpinner } from "@/components/ui";
import { MapPin, Globe, Phone, Mail, Calendar, MessageSquare, Send, ExternalLink, ArrowLeft } from "lucide-react";

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

export default function MarketplaceVendorProfile() {
  const { id } = useParams();
  const [vendor, setVendor] = useState<ExtendedVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Contact form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [venue, setVenue] = useState("");
  const [message, setMessage] = useState("");
  const [serviceInterest, setServiceInterest] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    const vendorId = Number(id);
    if (isNaN(vendorId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    api<{ vendor: ExtendedVendor }>(`/marketplace/vendors/${vendorId}`)
      .then((data) => {
        setVendor(data.vendor);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    setSending(true);
    try {
      await api<VendorInquiry>("/marketplace/inquiries", {
        method: "POST",
        body: {
          vendorId: vendor.id,
          name,
          email,
          phone: phone || null,
          weddingDate: weddingDate || null,
          venue: venue || null,
          message,
          serviceInterest: serviceInterest || null,
        },
      });
      setSent(true);
      toast.success("Your inquiry has been sent!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send inquiry",
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Not Found</h1>
        <p className="text-gray-500 mt-2">
          This vendor is not available in the marketplace.
        </p>
        <Link
          href="/marketplace"
          className="mt-4 text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/marketplace"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vendor Info */}
          <div className="lg:col-span-2">
            <Card>
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center overflow-hidden">
                  {vendor.profileImage ? (
                    <img
                      src={vendor.profileImage}
                      alt={vendor.businessName || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-brand-500 font-bold">
                      {(vendor.businessName || "V")[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {vendor.businessName || vendor.name}
                  </h1>
                  {(vendor.city || vendor.state) && (
                    <p className="text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {vendor.description && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">About</h2>
                  <p className="mt-2 text-gray-600 whitespace-pre-wrap">
                    {vendor.description}
                  </p>
                </div>
              )}

              {/* Service Categories */}
              {vendor.serviceCategories && vendor.serviceCategories.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">Services</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vendor.serviceCategories.map((cat) => (
                      <Badge key={cat} variant="info">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Website */}
              {vendor.businessWebsite && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900">Website</h2>
                  <a
                    href={vendor.businessWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                  >
                    <Globe className="w-4 h-4" />
                    {vendor.businessWebsite}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Send Inquiry
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Interested in this vendor? Send them a message.
              </p>

              {sent ? (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium text-sm">
                    Your inquiry has been sent!
                  </p>
                  <p className="text-green-600 text-xs mt-1">
                    The vendor will review and get back to you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <Input
                    label="Name *"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Email *"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Wedding Date"
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                  />
                  <Input
                    label="Venue"
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Wedding venue (optional)"
                  />
                  <Select
                    label="Service Interest"
                    value={serviceInterest}
                    onChange={(e) => setServiceInterest(e.target.value)}
                  >
                    <option value="">Select a service (optional)</option>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell the vendor about your wedding..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={sending}
                    loading={sending}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-1" /> Send Inquiry
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}