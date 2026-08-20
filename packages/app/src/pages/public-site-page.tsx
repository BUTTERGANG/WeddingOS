import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { api } from "@/lib/api";
import { SEO } from "@/components/seo";
import type { SitePage } from "@/lib/types";

function getVendorId(): number {
  const fromStorage = localStorage.getItem("publicVendorId");
  if (fromStorage) return Number(fromStorage);
  return 1;
}

export default function PublicSitePage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug || "home";
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const vendorId = getVendorId();

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ page: SitePage }>(
          `/site-pages/public/${slug}?vendorId=${vendorId}`,
        );
        setPage(data.page);
        document.title = data.page.seoTitle || data.page.title;
      } catch (e) {
        console.error("Failed to fetch page", e);
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

  if (!page) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 mb-4">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={page.seoTitle || page.title}
        description={page.seoDescription || undefined}
      />
      <div className="max-w-4xl mx-auto px-4 py-16">
        {slug !== "home" && (
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
        )}
        <div className="prose prose-gray max-w-none">
          {page.content?.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-4 text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}