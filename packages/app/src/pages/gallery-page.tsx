import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { api, apiUpload } from "@/lib/api";
import type { Gallery, GalleryImage } from "@/lib/types";

interface GalleryPageProps {
  clientId: string;
}

function GalleryDetail({
  gallery,
  onBack,
}: {
  gallery: Gallery;
  onBack: () => void;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<GalleryImage[]>(`/galleries/${gallery.id}/images`)
      .then((data) => setImages(data))
      .catch(() => toast.error("Failed to load images"))
      .finally(() => setLoading(false));
  }, [gallery.id]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const fd = new FormData();
          fd.append("image", file);
          const img = await apiUpload<GalleryImage>(
            `/galleries/${gallery.id}/images`,
            fd
          );
          setImages((prev) => [...prev, img]);
        }
        toast.success(`${acceptedFiles.length} image(s) uploaded`);
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [gallery.id]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
  });

  const togglePublish = async () => {
    try {
      await api(`/galleries/${gallery.id}`, {
        method: "PUT",
        body: { isPublished: !gallery.isPublished },
      });
      gallery.isPublished = !gallery.isPublished;
      toast.success(gallery.isPublished ? "Gallery published" : "Gallery unpublished");
    } catch {
      toast.error("Failed to update gallery");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-600 mb-1"
          >
            ← Back to galleries
          </button>
          <h2 className="text-xl font-bold text-gray-900">{gallery.title}</h2>
          {gallery.description && (
            <p className="text-sm text-gray-500">{gallery.description}</p>
          )}
        </div>
        <button
          onClick={togglePublish}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            gallery.isPublished
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {gallery.isPublished ? "Published" : "Draft"}
        </button>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-brand-400 bg-brand-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-sm text-gray-500">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-sm text-brand-600">Drop images here...</p>
        ) : (
          <div>
            <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">
              Drag & drop images, or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading images...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setLightboxImage(img)}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-brand-400 transition-all"
            >
              <img
                src={`/api/uploads/${img.filename}`}
                alt={img.originalName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {img.isFavorite && (
                <span className="absolute top-2 right-2 text-red-500 text-lg">❤️</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={`/api/uploads/${lightboxImage.filename}`}
            alt={lightboxImage.originalName}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function GalleryPage({ clientId }: GalleryPageProps) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeGallery, setActiveGallery] = useState<Gallery | null>(null);
  const [imageCounts, setImageCounts] = useState<Record<number, number>>({});

  // Add form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const fetchGalleries = () => {
    api<Gallery[]>(`/galleries/${clientId}`)
      .then((data) => {
        setGalleries(data);
        // Fetch image counts per gallery
        data.forEach((g) => {
          api<GalleryImage[]>(`/galleries/${g.id}/images`)
            .then((imgs) => setImageCounts((prev) => ({ ...prev, [g.id]: imgs.length })))
            .catch(() => {});
        });
      })
      .catch(() => toast.error("Failed to load galleries"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGalleries();
  }, [clientId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const g = await api<Gallery>(`/galleries`, {
        method: "POST",
        body: {
          clientId: parseInt(clientId),
          title: formTitle,
          description: formDesc || null,
        },
      });
      setGalleries((prev) => [...prev, g]);
      setShowAdd(false);
      setFormTitle("");
      setFormDesc("");
      toast.success("Gallery created");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create gallery");
    }
  };

  const togglePublish = async (gallery: Gallery) => {
    try {
      await api(`/galleries/${gallery.id}`, {
        method: "PUT",
        body: { isPublished: !gallery.isPublished },
      });
      setGalleries((prev) =>
        prev.map((g) =>
          g.id === gallery.id ? { ...g, isPublished: !g.isPublished } : g
        )
      );
    } catch {
      toast.error("Failed to update gallery");
    }
  };

  if (activeGallery) {
    return (
      <div className="max-w-5xl">
        <GalleryDetail gallery={activeGallery} onBack={() => setActiveGallery(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/clients/${clientId}`} className="text-sm text-gray-400 hover:text-gray-600">
              Client
            </Link>
            <span className="text-gray-300">/</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Galleries</h1>
          <p className="mt-1 text-sm text-gray-500">{galleries.length} galleries</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          New Gallery
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No galleries yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((gallery) => (
            <div
              key={gallery.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition-all"
              onClick={() => setActiveGallery(gallery)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{gallery.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePublish(gallery);
                  }}
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    gallery.isPublished
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {gallery.isPublished ? "Published" : "Draft"}
                </button>
              </div>
              {gallery.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {gallery.description}
                </p>
              )}
              <div className="flex items-center text-sm text-gray-400">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imageCounts[gallery.id] ?? 0} image(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add gallery modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Gallery</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">Create Gallery</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}