import { useState, useEffect, type FormEvent } from "react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { VendorMarketplaceProfile } from "@/lib/types";
import { Card, Button, Input, PageHeader, Skeleton } from "@/components/ui";

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

export default function MarketplaceSettings() {
  const [profile, setProfile] = useState<VendorMarketplaceProfile>({
    description: null,
    city: null,
    state: null,
    serviceCategories: [],
    profileImage: null,
    isVisibleInMarketplace: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api<{ profile: VendorMarketplaceProfile }>(
      "/vendor/marketplace/profile",
    )
      .then((data) => {
        setProfile(data.profile);
        setDescription(data.profile.description || "");
        setCity(data.profile.city || "");
        setState(data.profile.state || "");
        setSelectedCategories(data.profile.serviceCategories || []);
        setProfileImage(data.profile.profileImage || "");
        setVisible(data.profile.isVisibleInMarketplace || false);
      })
      .catch(() => {
        toast.error("Failed to load marketplace profile");
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat],
    );
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ profile: VendorMarketplaceProfile }>(
        "/vendor/marketplace/profile",
        {
          method: "PUT",
          body: {
            description: description || null,
            city: city || null,
            state: state || null,
            serviceCategories: selectedCategories,
            profileImage: profileImage || null,
            isVisibleInMarketplace: visible,
          },
        },
      );
      setProfile(data.profile);
      toast.success("Marketplace settings saved");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Marketplace Settings"
        description="Manage your vendor marketplace presence and visibility"
      />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Visibility Toggle */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Marketplace Visibility</h2>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, your business will appear in the public marketplace directory
          </p>
          <label className="mt-4 flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  visible ? "bg-brand-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-1 ml-1 ${
                    visible ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {visible
                ? "Visible in marketplace"
                : "Hidden from marketplace"}
            </span>
          </label>
        </Card>

        {/* Profile Info */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell couples about your business and services..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Portland"
              />
              <Input
                label="State"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. OR"
              />
            </div>
            <Input
              label="Profile Image URL"
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="https://example.com/my-photo.jpg"
            />
            {profileImage && (
              <img
                src={profileImage}
                alt="Preview"
                className="mt-2 w-24 h-24 rounded-lg object-cover border border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
        </Card>

        {/* Service Categories */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">Service Categories</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select the services you offer (click to toggle)
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategories.includes(cat)
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            loading={saving}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}