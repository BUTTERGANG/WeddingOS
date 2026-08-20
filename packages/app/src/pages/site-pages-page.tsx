import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import type { SitePage } from "@/lib/types";
import toast from "react-hot-toast";

export default function SitePagesPage() {
  const [, setLocation] = useLocation();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIsPublished, setNewIsPublished] = useState(false);
  const [newIsHomepage, setNewIsHomepage] = useState(false);
  const [newSeoTitle, setNewSeoTitle] = useState("");
  const [newSeoDescription, setNewSeoDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const data = await api<{ pages: SitePage[] }>("/site-pages");
      setPages(data.pages);
    } catch (e) {
      console.error("Failed to fetch pages", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      await api("/site-pages", {
        method: "POST",
        body: {
          title: newTitle.trim(),
          content: newContent,
          isPublished: newIsPublished,
          isHomepage: newIsHomepage,
          seoTitle: newSeoTitle || null,
          seoDescription: newSeoDescription || null,
        },
      });
      toast.success("Page created");
      setShowNewForm(false);
      setNewTitle("");
      setNewContent("");
      setNewIsPublished(false);
      setNewIsHomepage(false);
      setNewSeoTitle("");
      setNewSeoDescription("");
      fetchPages();
    } catch (e: any) {
      toast.error(e.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  };

  const togglePublish = async (page: SitePage) => {
    try {
      await api(`/site-pages/${page.id}`, {
        method: "PUT",
        body: { isPublished: !page.isPublished },
      });
      toast.success(`Page ${page.isPublished ? "unpublished" : "published"}`);
      fetchPages();
    } catch (e: any) {
      toast.error(e.message || "Failed to update page");
    }
  };

  const toggleHomepage = async (page: SitePage) => {
    try {
      await api(`/site-pages/${page.id}`, {
        method: "PUT",
        body: { isHomepage: !page.isHomepage },
      });
      toast.success(`Homepage ${page.isHomepage ? "removed" : "set"}`);
      fetchPages();
    } catch (e: any) {
      toast.error(e.message || "Failed to update page");
    }
  };

  const deletePage = async (id: number) => {
    if (!confirm("Delete this page?")) return;
    try {
      await api(`/site-pages/${id}`, { method: "DELETE" });
      toast.success("Page deleted");
      fetchPages();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete page");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Site Pages</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium"
        >
          {showNewForm ? "Cancel" : "New Page"}
        </button>
      </div>

      {/* New page form */}
      {showNewForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">New Page</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              placeholder="About Us"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
              placeholder="Page content..."
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newIsPublished}
                onChange={(e) => setNewIsPublished(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Published</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newIsHomepage}
                onChange={(e) => setNewIsHomepage(e.target.checked)}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Set as Homepage</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO Title
            </label>
            <input
              type="text"
              value={newSeoTitle}
              onChange={(e) => setNewSeoTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              placeholder="Custom page title for SEO"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO Description
            </label>
            <textarea
              value={newSeoDescription}
              onChange={(e) => setNewSeoDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              placeholder="Meta description"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 text-sm font-medium"
            >
              {creating ? "Creating..." : "Create Page"}
            </button>
          </div>
        </div>
      )}

      {/* Pages table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No pages yet. Create your first page above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Slug</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Homepage</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">{page.title}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{page.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(page)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        page.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {page.isPublished ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleHomepage(page)}
                      className={`text-xs font-medium ${
                        page.isHomepage ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {page.isHomepage ? "✓ Homepage" : "Set as Homepage"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setLocation(`/site-pages/${page.id}/edit`)}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}