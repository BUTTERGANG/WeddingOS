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
import SettingsPage from "@/pages/settings-page";
import CalendarPage from "@/pages/calendar-page";
import PublicBookingPage from "@/pages/public-booking-page";

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
      <Route path="/book/:vendorId">
        <PublicBookingPage />
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