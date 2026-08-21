import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Client, TimelineEvent } from "@/lib/types";
import { Card, Badge, Skeleton } from "@/components/ui";
import { Users, Calendar, FileText } from "lucide-react";

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
    api<{ clients: Client[] }>("/clients").then((data) => {
      const clients = data.clients ?? [];
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

    // Upcoming events and unpaid invoices data isn't available via dedicated endpoints yet;
    // for now these stats remain at their default (0) values
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const statCards = [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "bg-blue-500" },
    { label: "Active Clients", value: stats.activeClients, icon: Users, color: "bg-green-500" },
    { label: "Upcoming Weddings", value: stats.upcomingWeddings, icon: Calendar, color: "bg-purple-500" },
    { label: "Unpaid Invoices", value: stats.unpaidInvoices, icon: FileText, color: "bg-orange-500" },
  ];

  const statusVariant = (status: string) => {
    if (status === "active") return "success";
    if (status === "lead") return "warning";
    return "default";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Welcome back{vendor ? `, ${vendor.name}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Here's your wedding business at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <card.icon className={`w-5 h-5 ${card.color.replace("bg-", "text-")}`} />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent clients */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">Recent Clients</h2>
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
                  <Badge variant={statusVariant(client.status)}>
                    {client.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming events / mini calendar */}
        <Card>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
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
        </Card>
      </div>
    </div>
  );
}