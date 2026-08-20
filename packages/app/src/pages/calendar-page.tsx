import { useState, useEffect, type FormEvent } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { CalendarSlot } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";

type SlotWithStatus = CalendarSlot & { isBooked: boolean };

const SERVICE_TYPES = [
  "Consultation",
  "Venue Tour",
  "Tasting",
  "Planning Session",
  "Rehearsal",
  "Photography",
  "Other",
];

export default function CalendarPage() {
  const { vendor } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Add slot form
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);

  const fetchSlots = () => {
    setLoading(true);
    // Fetch all slots for a generous range so we see everything
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    api<{ slots: SlotWithStatus[] }>(
      `/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
    )
      .then((data) => setSlots(data.slots))
      .catch(() => toast.error("Failed to load slots"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const handleAddSlot = async (e: FormEvent) => {
    e.preventDefault();
    const slotStart = new Date(addDate);
    const [sh, sm] = startTime.split(":").map(Number);
    slotStart.setHours(sh, sm, 0, 0);

    const slotEnd = new Date(addDate);
    const [eh, em] = endTime.split(":").map(Number);
    slotEnd.setHours(eh, em, 0, 0);

    if (slotStart >= slotEnd) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      await api("/calendar", {
        method: "POST",
        body: {
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          serviceType,
        },
      });
      toast.success("Slot created");
      setShowAdd(false);
      fetchSlots();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create slot",
      );
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      await api(`/calendar/${slotId}`, { method: "DELETE" });
      toast.success("Slot deleted");
      fetchSlots();
    } catch {
      toast.error("Failed to delete slot");
    }
  };

  const formatTime = (iso: string) => {
    try {
      return format(parseISO(iso), "h:mm a");
    } catch {
      return iso;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), "MMM d, yyyy");
    } catch {
      return iso;
    }
  };

  const availableSlots = slots.filter((s) => !s.isBooked);
  const bookedSlots = slots.filter((s) => s.isBooked);

  const publicBookingUrl = vendor ? `/book/${vendor.id}` : "";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your availability and bookings
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Slot
        </Button>
      </div>

      {/* Public booking link */}
      {publicBookingUrl && (
        <Card className="bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Public Booking Link
              </h3>
              <p className="text-xs text-blue-600 mt-0.5">
                Share this link with clients so they can book appointments
              </p>
            </div>
            <Link
              href={publicBookingUrl}
              className="text-sm font-medium text-blue-700 hover:text-blue-800 underline"
              target="_blank"
            >
              {window.location.origin}
              {publicBookingUrl}
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar picker */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
          />
        </div>

        {/* Slots for selected date */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Slots for {format(selectedDate, "EEEE, MMM d, yyyy")}
            </h2>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-400">No slots for this date</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Add your first slot
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Available slots */}
                {availableSlots.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Available ({availableSlots.length})
                    </h3>
                    <div className="space-y-2">
                      {availableSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-white rounded-lg border border-green-200 p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatTime(slot.startTime)} -{" "}
                                {formatTime(slot.endTime)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {slot.serviceType || "General"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                            title="Delete slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Booked slots */}
                {bookedSlots.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">
                      Booked ({bookedSlots.length})
                    </h3>
                    <div className="space-y-2">
                      {bookedSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {formatTime(slot.startTime)} -{" "}
                                {formatTime(slot.endTime)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {slot.serviceType || "General"} · Client #
                                {slot.clientId}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add slot modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Availability Slot
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddSlot} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <DayPicker
                  mode="single"
                  selected={addDate}
                  onSelect={(d) => d && setAddDate(d)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Slot
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}