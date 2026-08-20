import { useState, useEffect } from "react";
import { api } from "@/lib/api";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Platform Settings
          </h1>
          <p className="mt-1 text-gray-400">
            {settings.length} setting{settings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
        >
          Add Setting
        </button>
      </div>

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
          <div>
            <label className="block text-sm text-gray-300 mb-1">Key</label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="site_name"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Value (JSON)
            </label>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder='"WeddingOS"'
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional description"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
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
          <p className="text-gray-400">No settings configured yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="bg-gray-800 rounded-xl border border-gray-700 p-4"
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
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(setting.key)}
                      className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
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
                          — {setting.description}
                        </span>
                      )}
                    </div>
                    <pre className="text-sm text-gray-300 font-mono bg-gray-900 rounded px-2 py-1 overflow-x-auto">
                      {JSON.stringify(setting.value, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => startEdit(setting)}
                      className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSetting(setting.key)}
                      className="px-3 py-1.5 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}