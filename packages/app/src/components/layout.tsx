import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Menu, LogOut, Gem, Sun, Moon, LayoutDashboard, Calendar,
  Users, Share2, FileText, Newspaper, Globe, Inbox,
  Store, Handshake, Settings,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/clients/shared", label: "Shared Clients", icon: Share2 },
  { href: "/blog", label: "Blog", icon: FileText },
  { href: "/site-pages", label: "Site Pages", icon: Globe },
  { href: "/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/settings/marketplace", label: "Marketplace", icon: Store },
  { href: "/settings/partners", label: "Partners", icon: Handshake },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { vendor, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard";
    return location.startsWith(href);
  };

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              WeddingOS
            </span>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Theme toggle + Vendor info + logout */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ThemeIcon className="w-4 h-4 mr-2" />
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {/* Vendor info */}
          <div className="px-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {vendor?.businessName || vendor?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {vendor?.email}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              WeddingOS
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            <ThemeIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto text-gray-900 dark:text-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}