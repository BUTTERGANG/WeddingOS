import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { api, apiUpload } from "@/lib/api";
import type { Gallery, GalleryImage, PrintProduct, PrintOrder } from "@/lib/types";
import { Image, Upload, X, Heart } from "lucide-react";
import { Skeleton, EmptyState } from "@/components/ui";

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

  // Print storefront state
  const [showPrintStore, setShowPrintStore] = useState(false);
  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [printImageId, setPrintImageId] = useState<number | null>(null);
  const [cartQuantities, setCartQuantities] = useState<Record<number, number>>({});
  const [orderResult, setOrderResult] = useState<{ message: string; checkoutUrl?: string } | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

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
            <Upload className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Drag & drop images, or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
        </div>
      ) : images.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No images yet"
          description="Upload photos to get started"
        />
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
                <span className="absolute top-2 right-2">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Order Prints button — visible when published and images exist */}
      {gallery.isPublished && images.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setShowPrintStore(true);
              setOrderResult(null);
              setCartQuantities({});
              setPrintImageId(images[0]?.id ?? null);
              api<PrintProduct[]>("/print-store/products")
                .then((data) => setProducts(data.filter((p) => p.isActive)))
                .catch(() => toast.error("Failed to load print products"));
            }}
            className="px-5 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
          >
            Order Prints
          </button>
        </div>
      )}

      {/* Print store modal */}
      {showPrintStore && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            if (!placingOrder) setShowPrintStore(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Print Store</h2>
              <button
                onClick={() => setShowPrintStore(false)}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
                disabled={placingOrder}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="p-5 space-y-5 overflow-y-auto grow">
              {/* Order result banner */}
              {orderResult && (
                <div className={`rounded-xl p-4 text-sm ${orderResult.checkoutUrl ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
                  <p className="font-medium mb-1">{orderResult.checkoutUrl ? "Order placed!" : orderResult.message}</p>
                  {orderResult.checkoutUrl ? (
                    <>
                      <p className="mb-2">{orderResult.message}</p>
                      <a
                        href={orderResult.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Proceed to Checkout →
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowPrintStore(false)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              )}

              {/* Image selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select image to print
                </label>
                <select
                  value={printImageId ?? ""}
                  onChange={(e) => setPrintImageId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  disabled={placingOrder || !!orderResult}
                >
                  {images.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.originalName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Products grouped by category */}
              {(["prints", "canvas", "metal", "book"] as const).map((category) => {
                const catProducts = products.filter(
                  (p) => p.category.toLowerCase() === category
                );
                if (catProducts.length === 0) return null;
                return (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-2 capitalize">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {catProducts
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((product) => {
                          const qty = cartQuantities[product.id] ?? 0;
                          return (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                            >
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </p>
                                {product.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                    {product.description}
                                  </p>
                                )}
                                <p className="text-sm font-semibold text-brand-600 mt-1">
                                  ${(product.priceCents / 100).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() =>
                                    setCartQuantities((prev) => ({
                                      ...prev,
                                      [product.id]: Math.max(0, (prev[product.id] ?? 0) - 1),
                                    }))
                                  }
                                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
                                  disabled={qty === 0 || !!orderResult}
                                >
                                  –
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-gray-900 tabular-nums">
                                  {qty}
                                </span>
                                <button
                                  onClick={() =>
                                    setCartQuantities((prev) => ({
                                      ...prev,
                                      [product.id]: (prev[product.id] ?? 0) + 1,
                                    }))
                                  }
                                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-30"
                                  disabled={!!orderResult}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              {products.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No print products available
                </div>
              )}
            </div>

            {/* Footer — cart summary + place order */}
            <div className="border-t border-gray-200 p-5 shrink-0">
              {(() => {
                const subtotalCents = Object.entries(cartQuantities).reduce(
                  (sum, [productId, qty]) => {
                    const product = products.find(
                      (p) => p.id === Number(productId)
                    );
                    return sum + (product ? product.priceCents * qty : 0);
                  },
                  0
                );
                const subtotal = subtotalCents / 100;
                const shipping = subtotal >= 50 ? 0 : 5.99;
                const total = subtotal + shipping;
                const itemCount = Object.values(cartQuantities).reduce(
                  (sum, qty) => sum + qty,
                  0
                );

                return (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900 font-medium">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Shipping{subtotal >= 50 && subtotal > 0 ? " (free)" : ""}
                      </span>
                      <span
                        className={`font-medium ${
                          shipping === 0
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}
                      >
                        {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    {subtotal > 0 && subtotal < 50 && (
                      <p className="text-xs text-gray-400">
                        Add ${(50 - subtotal).toFixed(2)} more for free shipping
                      </p>
                    )}
                    <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={async () => {
                        if (!printImageId) {
                          toast.error("Please select an image");
                          return;
                        }
                        const items = Object.entries(cartQuantities)
                          .filter(([, qty]) => qty > 0)
                          .map(([productId, quantity]) => ({
                            productId: Number(productId),
                            quantity,
                          }));
                        if (items.length === 0) {
                          toast.error("Please add items to your cart");
                          return;
                        }
                        setPlacingOrder(true);
                        try {
                          const order = await api<PrintOrder & { checkoutUrl?: string }>(
                            "/print-store/orders",
                            {
                              method: "POST",
                              body: {
                                galleryId: gallery.id,
                                imageId: printImageId,
                                items,
                              },
                            }
                          );
                          if (order.checkoutUrl) {
                            setOrderResult({
                              message: "Your order has been placed! Click below to complete payment.",
                              checkoutUrl: order.checkoutUrl,
                            });
                          } else {
                            setOrderResult({
                              message: "Your order has been placed successfully!",
                            });
                          }
                          toast.success("Order placed!");
                        } catch (err: unknown) {
                          toast.error(
                            err instanceof Error ? err.message : "Failed to place order"
                          );
                        } finally {
                          setPlacingOrder(false);
                        }
                      }}
                      disabled={
                        itemCount === 0 || !printImageId || placingOrder || !!orderResult
                      }
                      className="w-full py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {placingOrder
                        ? "Placing order..."
                        : orderResult
                          ? "Order Placed"
                          : `Place Order (${itemCount} item${itemCount === 1 ? "" : "s"})`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
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
            <X className="w-8 h-8" />
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
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          New Gallery
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : galleries.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No galleries yet"
          description="Create a gallery to start sharing photos with your clients"
        />
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
                <Image className="w-4 h-4 mr-1" />
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
                <X className="w-5 h-5" />
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