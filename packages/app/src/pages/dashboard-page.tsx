import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Client, TimelineEvent } from "@/lib/types";

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  upcomingWeddings: number;
  unpaidInvoices: number;
}

export default function DashboardPage() {
  const { vendor } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    upcomingWeddings: 0,
    unpaidInvoices: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<TimelineEvent[]>([]);
  const [weekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    api<Client[]>("/clients").then((clients) => {
      setRecentClients(clients.slice(0, 5));
      setStats((prev) => ({
        ...prev,
        totalClients: clients.length,
        activeClients: clients.filter((c) => c.status === "active").length,
        upcomingWeddings: clients.filter(
          (c) => c.weddingDate && new Date(c.weddingDate) > new Date()
        ).length,
      }));
    }).catch(() => {});

    // Get upcoming timeline events across all clients
    api<TimelineEvent[]>("/timeline/upcoming").then((events) => {
      setUpcomingEvents(events.slice(0, 7));
    }).catch(() => {});

    // Get unpaid invoice count
    api<any[]>("/invoices/unpaid").then((invoices) => {
      setStats((prev) => ({ ...prev, unpaidInvoices: invoices.length }));
    }).catch(() => {});
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, color: "bg-blue-500" },
    { label: "Active Clients", value: stats.activeClients, color: "bg-green-500" },
    { label: "Upcoming Weddings", value: stats.upcomingWeddings, color: "bg-purple-500" },
    { label: "Unpaid Invoices", value: stats.unpaidInvoices, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{vendor ? `, ${vendor.name}` : ""}!
        </h1>
        <p className="mt-1 text-gray-500">Here's your wedding business at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${card.color}`} />
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Clients</h2>
            <Link
              href="/clients"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all
            </Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="text-sm text-gray-400">No clients yet</p>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      {client.weddingDate
                        ? format(new Date(client.weddingDate), "MMM d, yyyy")
                        : "No date set"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      client.status === "active"
                        ? "bg-green-100 text-green-700"
                        : client.status === "lead"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {client.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events / mini calendar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            This Week
          </h2>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => {
              const hasEvent = upcomingEvents.some(
                (e) =>
                  e.eventDate &&
                  isSameDay(new Date(e.eventDate), day)
              );
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="text-center">
                  <p className="text-xs text-gray-400 mb-1">
                    {format(day, "EEE")}
                  </p>
                  <div
                    className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm ${
                      isToday
                        ? "bg-brand-500 text-white font-bold"
                        : "text-gray-700"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {hasEvent && (
                    <div className="flex justify-center mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No events this week</p>
            ) : (
              upcomingEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || "#d946ef" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </p>
                    {event.eventDate && (
                      <p className="text-xs text-gray-500">
                        {format(new Date(event.eventDate), "MMM d")}
                        {event.startTime && ` · ${event.startTime}`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}