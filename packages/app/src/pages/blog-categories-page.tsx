import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { BlogCategory } from "@/lib/types";
import toast from "react-hot-toast";

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await api<{ categories: BlogCategory[] }>("/blog/categories");
      setCategories(data.categories);
    } catch (e) {
      console.error("Failed to fetch categories", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await api<{ category: BlogCategory }>("/blog/categories", {
        method: "POST",
        body: { name: newName.trim() },
      });
      setNewName("");
      toast.success("Category created");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Failed to create category");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await api(`/blog/categories/${id}`, {
        method: "PUT",
        body: { name: editName.trim(), sortOrder: editSortOrder },
      });
      setEditingId(null);
      toast.success("Category updated");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Failed to update category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? Posts in this category will be uncategorized.")) return;
    try {
      await api(`/blog/categories/${id}`, { method: "DELETE" });
      toast.success("Category deleted");
      fetchCategories();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Blog Categories</h1>
      </div>

      {/* New category */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
            placeholder="New category name"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Categories list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No categories yet. Create your first one above.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Slug
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                  Sort Order
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {editingId === cat.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-400">{cat.slug}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={editSortOrder}
                          onChange={(e) => setEditSortOrder(Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(cat.id)}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {cat.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.sortOrder}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                              setEditSortOrder(cat.sortOrder);
                            }}
                            className="text-sm text-brand-600 hover:text-brand-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}