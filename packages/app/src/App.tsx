import { Router, Route, Switch, Redirect } from "wouter";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import ClientDetailPage from "@/pages/client-detail-page";
import TimelinePage from "@/pages/timeline-page";
import GalleryPage from "@/pages/gallery-page";
import InvoicesPage from "@/pages/invoices-page";
import ContractsPage from "@/pages/contracts-page";
import PricingPage from "@/pages/pricing-page";
import SettingsPage from "@/pages/settings-page";
import CalendarPage from "@/pages/calendar-page";
import PublicBookingPage from "@/pages/public-booking-page";
import BlogListPage from "@/pages/blog-list-page";
import BlogCategoriesPage from "@/pages/blog-categories-page";
import BlogEditorPage from "@/pages/blog-editor-page";
import SitePagesPage from "@/pages/site-pages-page";
import SitePageEditorPage from "@/pages/site-page-editor-page";
import PublicBlogPage from "@/pages/public-blog-page";
import PublicSitePage from "@/pages/public-site-page";
import AdminLoginPage from "@/pages/admin-login-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminVendorsPage from "@/pages/admin-vendors-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import PartnerManagementPage from "@/pages/partner-management-page";
import SharedClientsPage from "@/pages/shared-clients-page";
import MarketplaceDirectory from "@/pages/marketplace-directory";
import MarketplaceVendorProfile from "@/pages/marketplace-vendor-profile";
import MarketplaceSettings from "@/pages/marketplace-settings";
import MarketplaceInbox from "@/pages/marketplace-inbox";
import { AdminLayout } from "@/components/admin-layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { vendor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return <Redirect to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { vendor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (vendor) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { vendor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <Redirect to={vendor ? "/dashboard" : "/login"} />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login">
        <PublicRoute>
          <AuthPage mode="login" />
        </PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute>
          <AuthPage mode="register" />
        </PublicRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/clients">
        <ProtectedRoute>
          <ClientsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/clients/:id">
        {(params) => (
          <ProtectedRoute>
            <ClientDetailPage clientId={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/clients/:id/timeline">
        {(params) => (
          <ProtectedRoute>
            <TimelinePage clientId={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/clients/:id/gallery">
        {(params) => (
          <ProtectedRoute>
            <GalleryPage clientId={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/clients/:id/invoices">
        {(params) => (
          <ProtectedRoute>
            <InvoicesPage clientId={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/clients/:id/contracts">
        {(params) => (
          <ProtectedRoute>
            <ContractsPage clientId={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/clients/:id/pricing">
        {(params) => (
          <ProtectedRoute>
            <PricingPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute>
          <CalendarPage />
        </ProtectedRoute>
      </Route>

      {/* Protected Blog routes */}
      <Route path="/blog/categories">
        <ProtectedRoute>
          <BlogCategoriesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/blog/new">
        <ProtectedRoute>
          <BlogEditorPage />
        </ProtectedRoute>
      </Route>
      <Route path="/blog/:id/edit">
        {(params) => (
          <ProtectedRoute>
            <BlogEditorPage key={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/blog">
        <ProtectedRoute>
          <BlogListPage />
        </ProtectedRoute>
      </Route>

      {/* Protected Site Pages routes */}
      <Route path="/site-pages/:id/edit">
        {(params) => (
          <ProtectedRoute>
            <SitePageEditorPage key={params.id} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/site-pages">
        <ProtectedRoute>
          <SitePagesPage />
        </ProtectedRoute>
      </Route>

      {/* Public routes (no auth required) */}
      <Route path="/book/:vendorId">
        <PublicBookingPage />
      </Route>

      {/* Public blog — rendered at /public/blog and /public/blog/:slug */}
      <Route path="/public/blog/:slug">
        {(params) => <PublicBlogPage />}
      </Route>
      <Route path="/public/blog">
        <PublicBlogPage />
      </Route>

      {/* Public site pages */}
      <Route path="/p/:slug">
        {(params) => <PublicSitePage />}
      </Route>

      {/* Multi-vendor routes */}
      <Route path="/settings/partners">
        <ProtectedRoute>
          <PartnerManagementPage />
        </ProtectedRoute>
      </Route>
      <Route path="/clients/shared">
        <ProtectedRoute>
          <SharedClientsPage />
        </ProtectedRoute>
      </Route>

      {/* Marketplace routes — public (no Layout) */}
      <Route path="/marketplace" component={MarketplaceDirectory} />
      <Route path="/marketplace/:id" component={MarketplaceVendorProfile} />

      {/* Marketplace routes — protected (with Layout) */}
      <Route path="/settings/marketplace">
        <ProtectedRoute>
          <MarketplaceSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/inquiries">
        <ProtectedRoute>
          <MarketplaceInbox />
        </ProtectedRoute>
      </Route>

      {/* Admin routes — separate auth via admin-session cookie */}
      <Route path="/admin/login">
        <AdminLoginPage />
      </Route>
      <Route path="/admin/vendors">
        <AdminLayout>
          <AdminVendorsPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout>
          <AdminSettingsPage />
        </AdminLayout>
      </Route>
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      </Route>

      <Route>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800">404</h1>
            <p className="mt-2 text-gray-500">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;