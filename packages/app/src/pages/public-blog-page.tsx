import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { api } from "@/lib/api";
import { SEO } from "@/components/seo";
import type { BlogPost } from "@/lib/types";

// Get vendorId from URL path — for now we use a query param or a route param
function getVendorId(): number {
  // Try to get from path or localStorage
  const fromStorage = localStorage.getItem("publicVendorId");
  if (fromStorage) return Number(fromStorage);
  // Default demo
  return 1;
}

export default function PublicBlogPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;

  if (slug) {
    return <PublicBlogPostPage slug={slug} />;
  }

  return <PublicBlogListPage />;
}

function PublicBlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const vendorId = getVendorId();

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ posts: BlogPost[] }>(
          `/blog/public?vendorId=${vendorId}&limit=50`,
        );
        setPosts(data.posts);
      } catch (e) {
        console.error("Failed to fetch posts", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [vendorId]);

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Blog" />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Blog</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No posts yet.</div>
        ) : (
          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.id} className="border-b border-gray-100 pb-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {post.category && (
                      <span className="text-brand-600 font-medium">
                        {post.category.name}
                      </span>
                    )}
                    {post.publishedAt && (
                      <time>
                        {new Date(post.publishedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    )}
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-gray-600 leading-relaxed">{post.excerpt}</p>
                  )}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Read more →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PublicBlogPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<(BlogPost & { category?: any }) | null>(null);
  const [prevPost, setPrevPost] = useState<{ slug: string; title: string } | null>(null);
  const [nextPost, setNextPost] = useState<{ slug: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const vendorId = getVendorId();

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{
          post: BlogPost;
          prevPost: { slug: string; title: string } | null;
          nextPost: { slug: string; title: string } | null;
        }>(`/blog/public/${slug}?vendorId=${vendorId}`);
        setPost(data.post);
        setPrevPost(data.prevPost);
        setNextPost(data.nextPost);
        document.title = data.post.seoTitle || data.post.title;
      } catch (e) {
        console.error("Failed to fetch post", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, vendorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post not found</h1>
          <Link href="/blog" className="text-brand-600 hover:text-brand-700">
            ← Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO title={post.seoTitle || post.title} description={post.seoDescription || post.excerpt || undefined} />
      <article className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/blog" className="text-sm text-brand-600 hover:text-brand-700 mb-8 inline-block">
          ← Back to blog
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            {post.category && (
              <span className="text-brand-600 font-medium">{post.category?.name}</span>
            )}
            {post.publishedAt && (
              <time>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          {post.excerpt && (
            <p className="text-xl text-gray-500 leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full rounded-xl mb-8"
          />
        )}

        <div className="prose prose-gray max-w-none">
          {post.content?.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-4 text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Prev/Next navigation */}
        <nav className="mt-12 pt-8 border-t border-gray-200 flex justify-between">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="text-brand-600 hover:text-brand-700"
            >
              ← {prevPost.title}
            </Link>
          ) : (
            <div />
          )}
          {nextPost && (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="text-brand-600 hover:text-brand-700"
            >
              {nextPost.title} →
            </Link>
          )}
        </nav>
      </article>
    </div>
  );
}