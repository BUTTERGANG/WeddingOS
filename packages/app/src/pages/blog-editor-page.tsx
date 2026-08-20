import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { api } from "@/lib/api";
import type { BlogPost, BlogCategory } from "@/lib/types";
import toast from "react-hot-toast";
import { Button, Input, Select, PageHeader, Skeleton } from "@/components/ui";

export default function BlogEditorPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/blog/:id/edit");
  const [, newParams] = useRoute("/blog/new");
  const isNew = !!newParams;
  const postId = params?.id ? Number(params.id) : null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [status, setStatus] = useState("draft");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [tags, setTags] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ categories: BlogCategory[] }>("/blog/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }
    api<{ post: BlogPost }>(`/blog/posts/${postId}`)
      .then((data) => {
        const p = data.post;
        setTitle(p.title);
        setContent(p.content || "");
        setExcerpt(p.excerpt || "");
        setFeaturedImage(p.featuredImage || "");
        setStatus(p.status);
        setCategoryId(p.categoryId ?? "");
        setTags((p.tags || []).join(", "));
        setSeoTitle(p.seoTitle || "");
        setSeoDescription(p.seoDescription || "");
        setPublishedAt(
          p.publishedAt
            ? new Date(p.publishedAt).toISOString().slice(0, 16)
            : "",
        );
      })
      .catch(() => toast.error("Failed to load post"))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        content,
        excerpt,
        featuredImage,
        status,
        categoryId: categoryId || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        seoTitle,
        seoDescription,
      };

      if (status === "scheduled" && publishedAt) {
        body.publishedAt = new Date(publishedAt).toISOString();
      } else if (status === "published") {
        body.publishedAt = new Date().toISOString();
      }

      if (postId) {
        await api(`/blog/posts/${postId}`, { method: "PUT", body });
        toast.success("Post updated");
      } else {
        await api("/blog/posts", { method: "POST", body });
        toast.success("Post created");
      }
      setLocation("/blog");
    } catch (e: any) {
      toast.error(e.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId || !confirm("Delete this post?")) return;
    try {
      await api(`/blog/posts/${postId}`, { method: "DELETE" });
      toast.success("Post deleted");
      setLocation("/blog");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete post");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={isNew ? "New Post" : "Edit Post"}
        actions={
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setLocation("/blog")}>
              Cancel
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Main editor */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Content</h2>

          <Input
            label="Title *"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-sm"
              placeholder="Write your post content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              placeholder="Brief summary for listing pages"
            />
          </div>

          <Input
            label="Featured Image URL"
            type="text"
            value={featuredImage}
            onChange={(e) => setFeaturedImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        {/* Meta section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Post Settings</h2>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </Select>

            <Select
              label="Category"
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Tags (comma separated)"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="wedding, photography, planning"
          />

          {status === "scheduled" && (
            <Input
              label="Publish Date"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          )}
        </div>

        {/* SEO section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">SEO</h2>

          <Input
            label="SEO Title"
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Custom title for search engines"
          />
          <p className="mt-1 text-xs text-gray-400">
            Leave empty to use the post title
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO Description
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              placeholder="Meta description for search results"
            />
            <p className="mt-1 text-xs text-gray-400">
              Recommended: 150-160 characters
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            {isNew ? "Create Post" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}