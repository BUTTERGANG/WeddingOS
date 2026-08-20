import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, Button, Input, PageHeader } from "@/components/ui";

export default function SettingsPage() {
  const { vendor } = useAuth();

  // Business info
  const [businessName, setBusinessName] = useState(vendor?.businessName || "");
  const [businessWebsite, setBusinessWebsite] = useState(
    vendor?.businessWebsite || ""
  );
  const [phone, setPhone] = useState(vendor?.phone || "");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveBusiness = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/auth/settings", {
        method: "PUT",
        body: {
          businessName: businessName || null,
          businessWebsite: businessWebsite || null,
          phone: phone || null,
        },
      });
      toast.success("Business info updated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      await api("/auth/password", {
        method: "PUT",
        body: {
          currentPassword,
          newPassword,
        },
      });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Manage your business profile and account security"
      />

      {/* Business Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Business Information
        </h2>
        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <Input
            label="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
          />
          <Input
            label="Website"
            value={businessWebsite}
            onChange={(e) => setBusinessWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          <div className="pt-2">
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <div className="pt-2">
            <Button type="submit" loading={changingPassword}>
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Account info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900">{vendor?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-gray-900">{vendor?.name}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}