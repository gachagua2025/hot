import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, 
  BarChart3, 
  Tags, 
  Users, 
  CreditCard, 
  Router, 
  FileText, 
  Settings,
  LogOut,
  User,
  Ticket
} from "lucide-react";

interface AdminSidebarProps {
  admin: {
    id?: string;
    name?: string;
    username?: string;
    role?: string;
  };
}

export default function AdminSidebar({ admin }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem("admin");
    setLocation("/admin");
  };

  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/admin/dashboard" },
    { icon: Tags, label: "Subscription Plans", path: "/admin/plans" },
    { icon: Users, label: "Users", path: "/admin/users", badge: "143" },
    { icon: CreditCard, label: "Payments", path: "/admin/payments" },
    { icon: FileText, label: "Reports", path: "/admin/reports" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ];

  return (
    <aside className="fixed top-0 left-0 w-72 h-full bg-white shadow-lg border-r border-slate-200 z-40">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Wifi className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900" data-testid="text-app-title">
              HotSpot Admin
            </h1>
            <p className="text-sm text-slate-500">Provider Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 ${
                  location === item.path 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setLocation(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="mr-3 w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Badge 
                    className="ml-auto bg-primary/10 text-primary hover:bg-primary/20"
                    data-testid={`badge-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </li>
          ))}
          <li>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 ${
                  location === "/admin/vouchers" 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setLocation("/admin/vouchers")}
                data-testid="nav-vouchers"
              >
                <Ticket className="mr-3 w-4 h-4" />
                <span>Vouchers</span>
              </Button>
            </li>
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            className="flex-1 justify-start p-2 h-auto"
            onClick={() => setLocation("/admin/profile")}
            data-testid="button-profile"
          >
            <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center mr-3">
              <User className="text-slate-600 w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-slate-900" data-testid="text-admin-name">
                {admin?.name || "Admin User"}
              </p>
              <p className="text-sm text-slate-500" data-testid="text-admin-role">
                {admin?.role || "Administrator"}
              </p>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}