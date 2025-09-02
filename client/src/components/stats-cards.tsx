import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Router, DollarSign, ArrowUp, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    activeUsers: number;
    totalRevenue: string;
    connectedRouters: number;
    todaySales: string;
    todayTransactions: number;
  };
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="mt-4 h-4 bg-slate-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Active Users",
      value: stats?.activeUsers || 0,
      icon: Users,
      color: "bg-primary/10 text-primary",
      trend: { value: 12, label: "vs last week", positive: true },
      testId: "active-users"
    },
    {
      title: "Total Revenue",
      value: `KES ${stats?.totalRevenue || "0"}`,
      icon: TrendingUp,
      color: "bg-success/10 text-success",
      trend: { value: 8.2, label: "vs last month", positive: true },
      testId: "total-revenue"
    },
    {
      title: "Connected Routers",
      value: stats?.connectedRouters || 0,
      icon: Router,
      color: "bg-warning/10 text-warning",
      trend: { label: "All Online", positive: true },
      testId: "connected-routers"
    },
    {
      title: "Today's Sales",
      value: `KES ${stats?.todaySales || "0"}`,
      icon: DollarSign,
      color: "bg-emerald-500/10 text-emerald-500",
      trend: { label: `${stats?.todayTransactions || 0} transactions`, positive: true },
      testId: "todays-sales"
    },
  ];

  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 mb-8">
      {statsData.map((stat) => (
        <Card key={stat.title} className="border border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                <p 
                  className="text-3xl font-bold text-slate-900" 
                  data-testid={`stat-${stat.testId}`}
                >
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              {stat.trend.positive && stat.trend.value && (
                <>
                  <ArrowUp className="text-success w-4 h-4 mr-1" />
                  <span className="text-success font-medium">{stat.trend.value}%</span>
                  <span className="text-slate-600 ml-2">{stat.trend.label}</span>
                </>
              )}
              {stat.trend.positive && !stat.trend.value && (
                <>
                  <CheckCircle className="text-success w-4 h-4 mr-1" />
                  <span className="text-success font-medium">{stat.trend.label}</span>
                </>
              )}
              {!stat.trend.positive && (
                <span className="text-slate-600">{stat.trend.label}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
