import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import type { SitePage } from "@/lib/types";
import toast from "react-hot-toast";
import { Card, Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { Plus, Pencil, Eye, Trash2, Home, FileText } from "lucide-react";

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
      <PageHeader
        title="Site Pages"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNewForm(!showNewForm)}>
            {showNewForm ? "Cancel" : <><Plus className="w-4 h-4 mr-1" /> New Page</>}
          </Button>
        }
      />

      {/* New page form */}
      {showNewForm && (
        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Page</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="About Us"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
              <input
                type="text"
                value={newSeoTitle}
                onChange={(e) => setNewSeoTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="Custom page title for SEO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SEO Description</label>
              <textarea
                value={newSeoDescription}
                onChange={(e) => setNewSeoDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="Meta description"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleCreate} disabled={creating} loading={creating}>
                Create Page
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Pages table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No pages yet"
            description="Create your first page above."
          />
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
                    <button onClick={() => togglePublish(page)}>
                      <Badge variant={page.isPublished ? "success" : "default"}>
                        {page.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {page.isHomepage ? (
                      <Badge variant="purple">
                        <Home className="w-3 h-3 mr-1 inline" /> Homepage
                      </Badge>
                    ) : (
                      <button
                        onClick={() => toggleHomepage(page)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600"
                      >
                        Set as Homepage
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/site-pages/${page.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => deletePage(page.id)}>
                        Delete
                      </Button>
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