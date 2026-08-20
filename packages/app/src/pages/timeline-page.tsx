import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import type { TimelineEvent } from "@/lib/types";

interface TimelinePageProps {
  clientId: string;
}

const CATEGORIES = ["ceremony", "reception", "photos", "transport", "other"];
const CATEGORY_COLORS: Record<string, string> = {
  ceremony: "#ef4444",
  reception: "#f59e0b",
  photos: "#8b5cf6",
  transport: "#3b82f6",
  other: "#6b7280",
};

function SortableEventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: TimelineEvent;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>

      {/* Color dot */}
      <div
        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: event.color || CATEGORY_COLORS[event.category] || "#6b7280" }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
            {event.category}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {event.eventDate && <span>{new Date(event.eventDate).toLocaleDateString()}</span>}
          {event.startTime && <span>{event.startTime}</span>}
          {event.location && <span>📍 {event.location}</span>}
        </div>
        {event.description && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{event.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(event)}
          className="p-1.5 text-gray-400 hover:text-brand-600 rounded hover:bg-gray-100"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(event.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TimelinePage({ clientId }: TimelinePageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formColor, setFormColor] = useState("#d946ef");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchEvents = () => {
    api<TimelineEvent[]>(`/timeline/${clientId}`)
      .then(setEvents)
      .catch(() => toast.error("Failed to load timeline"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [clientId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = events.findIndex((e) => e.id === active.id);
    const newIndex = events.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...events];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Update sort orders
    const updated = reordered.map((e, i) => ({ ...e, sortOrder: i }));
    setEvents(updated);

    try {
      await api("/timeline/reorder", {
        method: "POST",
        body: { clientId: parseInt(clientId), eventIds: updated.map((e) => e.id) },
      });
    } catch {
      toast.error("Failed to save order");
      fetchEvents();
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormDate("");
    setFormStart("");
    setFormEnd("");
    setFormLocation("");
    setFormCategory("general");
    setFormColor("#d946ef");
    setEditingId(null);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const cid = parseInt(clientId);
    try {
      if (editingId) {
        await api(`/timeline/${editingId}`, {
          method: "PUT",
          body: {
            title: formTitle,
            description: formDesc || null,
            eventDate: formDate || null,
            startTime: formStart || null,
            endTime: formEnd || null,
            location: formLocation || null,
            category: formCategory,
            color: formColor || null,
          },
        });
        toast.success("Event updated");
      } else {
        await api("/timeline", {
          method: "POST",
          body: {
            clientId: cid,
            title: formTitle,
            description: formDesc || null,
            eventDate: formDate || null,
            startTime: formStart || null,
            endTime: formEnd || null,
            location: formLocation || null,
            category: formCategory,
            color: formColor || null,
            sortOrder: events.length,
          },
        });
        toast.success("Event added");
      }
      resetForm();
      setShowAdd(false);
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  const handleEdit = (event: TimelineEvent) => {
    setFormTitle(event.title);
    setFormDesc(event.description || "");
    setFormDate(event.eventDate || "");
    setFormStart(event.startTime || "");
    setFormEnd(event.endTime || "");
    setFormLocation(event.location || "");
    setFormCategory(event.category);
    setFormColor(event.color || "#d946ef");
    setEditingId(event.id);
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api(`/timeline/${id}`, { method: "DELETE" });
      toast.success("Event deleted");
      fetchEvents();
    } catch {
      toast.error("Failed to delete event");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/clients/${clientId}`} className="text-sm text-gray-400 hover:text-gray-600">
              Client
            </Link>
            <span className="text-gray-300">/</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
          <p className="mt-1 text-sm text-gray-500">{events.length} events</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
        >
          Add Event
        </button>
      </div>

      {/* Event list with drag and drop */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No events yet. Add your first timeline event!</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={events.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {events
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((event) => (
                  <SortableEventCard
                    key={event.id}
                    event={event}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Event" : "Add Event"}
              </h2>
              <button
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
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
                <textarea rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-full h-[38px] px-1 py-1 border border-gray-300 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
                  {editingId ? "Update Event" : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}