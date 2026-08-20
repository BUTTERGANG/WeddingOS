import { Link } from "wouter";
import { useTheme } from "@/lib/theme";
import { Sun, Moon, Gem, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";

const features = [
  "Timeline planning with drag-and-drop",
  "Password-protected client galleries",
  "Invoicing & Stripe payments",
  "Contracts with e-signature",
  "Calendar booking for clients",
  "Blog & SEO website pages",
  "Print store for photo sales",
  "AI-powered pricing recommendations",
  "Vendor marketplace directory",
  "Multi-vendor collaboration",
];

export default function WelcomePage() {
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Navigation bar */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Gem className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">WeddingOS</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              <ThemeIcon className="w-5 h-5" />
            </button>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-xs font-medium mb-6">
          <Gem className="w-3 h-3" />
          All-in-one wedding vendor platform
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
          Run your wedding business
          <br />
          <span className="text-brand-500">from one place</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Replace HoneyBook, Pixieset, Calendly, and DocuSign with a single
          platform. Manage clients, galleries, invoices, contracts, bookings,
          and your website — all without the monthly stack.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
            >
              <CheckCircle className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="max-w-lg mx-auto p-8 rounded-2xl bg-gray-900 dark:bg-gray-800 border border-gray-700">
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">
            Pricing
          </p>
          <p className="text-4xl font-bold text-white mb-2">
            $19<span className="text-lg text-gray-400 font-normal">/mo</span>
          </p>
          <p className="text-sm text-gray-400 mb-6">
            All features included. No per-client fees. Cancel anytime.
          </p>
          <Link href="/register">
            <Button size="lg" className="w-full">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} WeddingOS. Built by Buttergang.
        </div>
      </footer>
    </div>
  );
}