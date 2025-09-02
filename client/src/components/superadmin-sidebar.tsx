import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Building2, 
  Router, 
  DollarSign, 
  Shield, 
  LogOut 
} from "lucide-react";

interface SuperAdminSidebarProps {
  superAdmin: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
  };
}

export default function SuperAdminSidebar({ superAdmin }: SuperAdminSidebarProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem("superadmin");
    setLocation("/superadmin");
  };

  const navItems = [
    { icon: BarChart3, label: "Dashboard", path: "/superadmin/dashboard" },
    { icon: Building2, label: "Providers", path: "/superadmin/providers" },
    { icon: Router, label: "Routers", path: "/superadmin/routers" },
    { icon: DollarSign, label: "Revenue Analytics", path: "/superadmin/revenue" },
  ];

  return (
    <aside className="fixed top-0 left-0 w-72 h-full bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl border-r border-slate-700 z-40">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg" data-testid="text-app-title">
              Super Admin
            </h1>
            <p className="text-sm text-slate-300">System Control Center</p>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start px-4 py-3 text-left transition-all duration-200 ${
                  location === item.path 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}
                onClick={() => setLocation(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="mr-3 w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info and Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="mb-4 p-3 bg-slate-800 rounded-lg">
          <p className="text-white font-medium text-sm" data-testid="text-user-name">
            {superAdmin.name}
          </p>
          <p className="text-slate-400 text-xs">{superAdmin.email}</p>
          <Badge className="mt-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            Super Admin
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start px-4 py-3 text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-3 w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}