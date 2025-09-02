import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import type { MpesaTransaction } from "@shared/schema";

export default function RecentPayments() {
  const { data: transactions, isLoading } = useQuery<MpesaTransaction[]>({
    queryKey: ['/api/admin/transactions/recent'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-3 bg-slate-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const transactionDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    return `${Math.floor(diffInMinutes / 1440)} day ago`;
  };

  const getIconColor = (index: number) => {
    const colors = [
      "bg-success/10 text-success",
      "bg-primary/10 text-primary", 
      "bg-warning/10 text-warning"
    ];
    return colors[index % colors.length];
  };

  const formatPhoneNumber = (phone: string) => {
    // Format 254712345678 to +254 712 345 678
    if (phone.startsWith('254')) {
      return `+254 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
    }
    return phone;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Recent Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions && transactions.length > 0 ? (
            <>
              {transactions.map((transaction, index) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between"
                  data-testid={`payment-item-${transaction.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(index)}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900" data-testid={`payment-phone-${transaction.id}`}>
                        {formatPhoneNumber(transaction.phoneNumber)}
                      </p>
                      <p className="text-sm text-slate-500" data-testid={`payment-status-${transaction.id}`}>
                        {transaction.status === 'completed' ? 'Payment Completed' : 
                         transaction.status === 'pending' ? 'Payment Pending' : 
                         'Payment Failed'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900" data-testid={`payment-amount-${transaction.id}`}>
                      KES {transaction.amount}
                    </p>
                    <p className="text-sm text-slate-500" data-testid={`payment-time-${transaction.id}`}>
                      {formatTimeAgo(transaction.createdAt.toString())}
                    </p>
                  </div>
                </div>
              ))}
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary/80 font-medium text-sm"
                data-testid="button-view-all-payments"
              >
                View All Payments
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="text-slate-400 w-8 h-8" />
              </div>
              <p className="text-slate-500 font-medium">No recent payments</p>
              <p className="text-sm text-slate-400">
                Payment transactions will appear here once customers make purchases
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
