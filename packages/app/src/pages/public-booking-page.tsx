import { useState, useEffect, type FormEvent } from "react";
import { useParams } from "wouter";
import { format, parseISO } from "date-fns";
import type { CalendarSlot } from "@/lib/types";
import { ChevronLeft, Calendar } from "lucide-react";
import { Button, Card } from "@/components/ui";

const API_BASE = "";

interface AvailableResponse {
  slots: CalendarSlot[];
}

interface BookResponse {
  message: string;
  clientId: number;
  slot: {
    id: number;
    startTime: string;
    endTime: string;
  };
}

interface BookFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

export default function PublicBookingPage() {
  const { vendorId } = useParams();
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking flow
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [form, setForm] = useState<BookFormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    slot: { startTime: string; endTime: string };
    clientName: string;
    clientEmail: string;
  } | null>(null);

  const fetchSlots = () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);

    const start = new Date().toISOString();
    const end = new Date(Date.now() + 14 * 864e5).toISOString();

    fetch(
      `${API_BASE}/api/calendar/public/${vendorId}/available?startDate=${start}&endDate=${end}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load available slots");
        return res.json();
      })
      .then((data: AvailableResponse) => setSlots(data.slots))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSlots();
  }, [vendorId]);

  // Group slots by date
  const groupedSlots: Record<string, CalendarSlot[]> = {};
  slots.forEach((slot) => {
    const dateKey = format(parseISO(slot.startTime), "yyyy-MM-dd");
    if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
    groupedSlots[dateKey].push(slot);
  });

  const sortedDates = Object.keys(groupedSlots).sort();

  const formatTime = (iso: string) => {
    try {
      return format(parseISO(iso), "h:mm a");
    } catch {
      return iso;
    }
  };

  const formatDateHeader = (dateKey: string) => {
    try {
      return format(parseISO(dateKey), "EEEE, MMMM d, yyyy");
    } catch {
      return dateKey;
    }
  };

  const handleSelectSlot = (slot: CalendarSlot) => {
    setSelectedSlot(slot);
    setConfirmed(null);
  };

  const handleFormChange = (field: keyof BookFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBook = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !vendorId) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/calendar/public/${vendorId}/book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: selectedSlot.id,
            ...form,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: "Booking failed" } }));
        throw new Error(err.error?.message || "Booking failed");
      }

      const data: BookResponse = await res.json();
      setConfirmed({
        slot: data.slot,
        clientName: form.clientName,
        clientEmail: form.clientEmail,
      });
      setSelectedSlot(null);
      setForm({ clientName: "", clientEmail: "", clientPhone: "", notes: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSlots = () => {
    setSelectedSlot(null);
    setError(null);
  };

  // Confirmation view
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-500 mb-6">
            Your appointment has been booked successfully. A confirmation email
            has been sent to {confirmed.clientEmail}.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Booking Details
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Date:</span>{" "}
              {formatDateForDisplay(confirmed.slot.startTime)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Time:</span>{" "}
              {formatTime(confirmed.slot.startTime)} -{" "}
              {formatTime(confirmed.slot.endTime)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Name:</span>{" "}
              {confirmed.clientName}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span>{" "}
              {confirmed.clientEmail}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            We look forward to meeting with you!
          </p>
        </div>
      </div>
    );
  }

  // Booking form view
  if (selectedSlot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <button
            onClick={handleBackToSlots}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to available slots
          </button>

          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Complete Your Booking
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {formatDateForDisplay(selectedSlot.startTime)} ·{" "}
            {formatTime(selectedSlot.startTime)} -{" "}
            {formatTime(selectedSlot.endTime)}
            {selectedSlot.serviceType && (
              <>
                {" · "}
                {selectedSlot.serviceType}
              </>
            )}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={form.clientName}
                onChange={(e) => handleFormChange("clientName", e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.clientEmail}
                onChange={(e) =>
                  handleFormChange("clientEmail", e.target.value)
                }
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) =>
                  handleFormChange("clientPhone", e.target.value)
                }
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Anything you'd like us to know..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              />
            </div>

            <Button
              type="submit"
              loading={submitting}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Slot list view (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Book an Appointment
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Select a time slot that works for you
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {error}
            <button
              onClick={fetchSlots}
              className="block mt-2 text-red-600 font-medium underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-400">
              Loading available slots...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && slots.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              No available slots found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Check back later for new availability
            </p>
          </div>
        )}

        {/* Slots grouped by date */}
        {!loading &&
          !error &&
          slots.length > 0 &&
          sortedDates.map((dateKey) => (
            <div key={dateKey} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                {formatDateHeader(dateKey)}
              </h2>
              <div className="space-y-2">
                {groupedSlots[dateKey].map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSelectSlot(slot)}
                    className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </p>
                        {slot.serviceType && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {slot.serviceType}
                          </p>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function formatDateForDisplay(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE, MMMM d, yyyy");
  } catch {
    return iso;
  }
}