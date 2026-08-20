import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, Button, Input, PageHeader } from "@/components/ui";
import { Plus, Pencil, Trash2, Settings, X } from "lucide-react";

interface PlatformSetting {
  id: number;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api<{ settings: PlatformSetting[] }>("/admin/settings");
      setSettings(data.settings);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setSuccess(null);
    setTimeout(() => setError(null), 5000);
  };

  const startEdit = (setting: PlatformSetting) => {
    setEditingKey(setting.key);
    setEditValue(JSON.stringify(setting.value, null, 2));
    setEditDescription(setting.description ?? "");
  };

  const saveEdit = async (key: string) => {
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        showError("Value must be valid JSON");
        return;
      }

      await api(`/admin/settings/${key}`, {
        method: "PUT",
        body: {
          value: parsedValue,
          description: editDescription || undefined,
        },
      });
      showSuccess(`Setting "${key}" updated`);
      setEditingKey(null);
      fetchSettings();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const deleteSetting = async (key: string) => {
    if (!confirm(`Delete setting "${key}"?`)) return;
    try {
      await api(`/admin/settings/${key}`, { method: "DELETE" });
      showSuccess(`Setting "${key}" deleted`);
      fetchSettings();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const createSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        showError("Value must be valid JSON");
        return;
      }

      await api("/admin/settings", {
        method: "POST",
        body: {
          key: newKey,
          value: parsedValue,
          description: newDescription || undefined,
        },
      });
      showSuccess(`Setting "${newKey}" created`);
      setShowNewForm(false);
      setNewKey("");
      setNewValue("");
      setNewDescription("");
      fetchSettings();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Platform Settings"
        description={`${settings.length} setting${settings.length !== 1 ? "s" : ""}`}
        actions={
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Setting
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}

      {/* New Setting Form */}
      {showNewForm && (
        <form
          onSubmit={createSetting}
          className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4"
        >
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            New Setting
          </h3>
          <Input
            label="Key"
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="site_name"
            required
          />
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Value (JSON)
            </label>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={'"WeddingOS"'}
              required
            />
          </div>
          <Input
            label="Description"
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Optional description"
          />
          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowNewForm(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Settings List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : settings.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
          <Settings className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No settings configured yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <Card
              key={setting.id}
              className="bg-gray-800 border-gray-700 p-4"
            >
              {editingKey === setting.key ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-400 font-mono">
                      {setting.key}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Value (JSON)
                    </label>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <Input
                    label="Description"
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(setting.key)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingKey(null)}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-indigo-400 font-mono">
                        {setting.key}
                      </span>
                      {setting.description && (
                        <span className="text-xs text-gray-500 truncate">
                          &mdash; {setting.description}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm text-gray-300 font-mono bg-gray-900 rounded px-2 py-1 overflow-x-auto">
                      {JSON.stringify(setting.value, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(setting)}
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteSetting(setting.key)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}