import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import type { BlogPost } from "@/lib/types";
import { Button, Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { Plus, BookOpen } from "lucide-react";

export default function BlogListPage() {
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set("status", statusFilter);
      const data = await api<{ posts: BlogPost[]; total: number }>(`/blog/posts?${params}`);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to fetch posts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page, statusFilter]);

  const deletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    try {
      await api(`/blog/posts/${id}`, { method: "DELETE" });
      fetchPosts();
    } catch (e) {
      console.error("Failed to delete post", e);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Blog Posts"
        actions={
          <Button variant="primary" size="sm" onClick={() => setLocation("/blog/new")}>
            <Plus className="w-4 h-4 mr-1" /> New Post
          </Button>
        }
      />

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {["", "draft", "published", "scheduled"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              statusFilter === s
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Posts table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No posts yet"
            description="Create your first blog post!"
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Published</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/blog/${post.id}/edit`}
                      className="text-sm font-medium text-gray-900 hover:text-brand-600"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        post.status === "published" ? "success"
                        : post.status === "scheduled" ? "info"
                        : "default"
                      }
                    >
                      {post.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {post.category?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/blog/${post.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Button variant="danger" size="sm" onClick={() => deletePost(post.id)}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}