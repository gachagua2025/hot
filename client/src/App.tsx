import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import CaptivePortal from "./pages/captive-portal";
import AdminDashboard from "./pages/admin-dashboard";
import AdminLogin from "./pages/admin-login";
import AdminPlans from "./pages/admin-plans";
import AdminUsers from "./pages/admin-users";
import AdminPayments from "./pages/admin-payments";
import AdminRouters from "./pages/admin-routers";
import AdminReports from "./pages/admin-reports";
import AdminSettings from "./pages/admin-settings";
import AdminVouchers from "./pages/admin-vouchers";
import AdminProfile from "./pages/admin-profile";
import SuperAdminLogin from "./pages/superadmin-login";
import SuperAdminDashboard from "./pages/superadmin-dashboard";
import SuperAdminProviders from "./pages/superadmin-providers";
import SuperAdminProviderProfile from "./pages/superadmin-provider-profile";
import SuperAdminRouters from "./pages/superadmin-routers";
import SuperAdminRevenue from "./pages/superadmin-revenue";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CaptivePortal} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/plans" component={AdminPlans} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/routers" component={AdminRouters} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/vouchers" component={AdminVouchers} />
      <Route path="/admin/profile" component={AdminProfile} />
      <Route path="/superadmin" component={SuperAdminLogin} />
      <Route path="/superadmin/dashboard" component={SuperAdminDashboard} />
      <Route path="/superadmin/providers" component={SuperAdminProviders} />
      <Route path="/superadmin/providers/:providerId/profile" component={SuperAdminProviderProfile} />
      <Route path="/superadmin/routers" component={SuperAdminRouters} />
      <Route path="/superadmin/revenue" component={SuperAdminRevenue} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;