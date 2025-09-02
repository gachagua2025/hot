import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Smartphone, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan, MpesaPaymentRequest } from "@shared/schema";

interface PaymentModalProps {
  plan: SubscriptionPlan;
  macAddress: string;
  onClose: () => void;
  onPaymentInitiated: (transactionId: string) => void;
  onVoucherSuccess?: () => void;
}

export default function PaymentModal({ plan, macAddress, onClose, onPaymentInitiated, onVoucherSuccess }: PaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const { toast } = useToast();

  const paymentMutation = useMutation({
    mutationFn: async (data: MpesaPaymentRequest) => {
      const response = await apiRequest("POST", "/api/payment/initiate", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Payment Initiated",
          description: "Check your phone for the M-Pesa prompt",
        });
        onPaymentInitiated(data.transactionId);
      } else {
        toast({
          title: "Payment Failed",
          description: data.message || "Failed to initiate payment",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const voucherMutation = useMutation({
    mutationFn: async (data: { voucherCode: string; macAddress: string }) => {
      const response = await apiRequest("POST", "/api/voucher/redeem", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "Voucher redeemed successfully. You now have internet access!",
      });
      onClose();
      // Call voucher success callback to go directly to success page
      if (onVoucherSuccess) {
        onVoucherSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Voucher Error",
        description: error.message || "Failed to redeem voucher",
        variant: "destructive",
      });
    },
  });

  // Function to detect router ID from environment or URL parameters
  const getRouterIdentification = (): string | undefined => {
    // Check URL parameters first (e.g., ?routerId=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const routerIdParam = urlParams.get('routerId');
    if (routerIdParam) {
      return routerIdParam;
    }

    // Check for router identification in hostname or subdomain
    const hostname = window.location.hostname;
    
    // Pattern: router-{id}.domain.com or {routerId}.domain.com
    const subdomainMatch = hostname.match(/^([a-f0-9\-]+)\./);
    if (subdomainMatch && subdomainMatch[1].length > 10) {
      return subdomainMatch[1];
    }

    // Check localStorage for router identification (set by captive portal redirect)
    const storedRouterId = localStorage.getItem('hotspot_router_id');
    if (storedRouterId) {
      return storedRouterId;
    }

    // Check session storage for temporary router identification
    const sessionRouterId = sessionStorage.getItem('current_router_id');
    if (sessionRouterId) {
      return sessionRouterId;
    }

    return undefined;
  };

  const handleMpesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    // Basic phone number validation
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 9 || cleanedPhone.length > 12) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    // Format phone number to international format
    let formattedPhone = cleanedPhone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Get router identification for router-specific payment gateways
    const routerId = getRouterIdentification();
    
    console.log('🔍 Router identification:', routerId ? `Found: ${routerId}` : 'Not detected - using general payment gateways');

    paymentMutation.mutate({
      phoneNumber: formattedPhone,
      planId: plan.id,
      macAddress,
      routerId, // Include router ID if detected
    });
  };

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voucherCode.trim()) {
      toast({
        title: "Voucher Code Required",
        description: "Please enter your voucher code",
        variant: "destructive",
      });
      return;
    }

    voucherMutation.mutate({
      voucherCode: voucherCode.trim().toUpperCase(),
      macAddress,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-900">
              Complete Payment
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              data-testid="button-close-payment-modal"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Plan */}
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">
              Selected Plan
            </Label>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium" data-testid="text-selected-plan-name">
                  {plan.name}
                </span>
                <span className="font-bold text-primary" data-testid="text-selected-plan-price">
                  KES {plan.price}
                </span>
              </div>
              <p className="text-sm text-slate-600" data-testid="text-selected-plan-duration">
                {plan.durationHours >= 24 
                  ? `${Math.floor(plan.durationHours / 24)} Day${Math.floor(plan.durationHours / 24) > 1 ? 's' : ''} Access`
                  : `${plan.durationHours} Hours Access`
                }
              </p>
            </div>
          </div>

          {/* Payment Options */}
          <Tabs defaultValue="mpesa" className="w-full">
            <TabsList className="grid w-full grid-cols-2" data-testid="tabs-payment-methods">
              <TabsTrigger value="mpesa" className="flex items-center gap-2" data-testid="tab-mpesa">
                <Smartphone className="w-4 h-4" />
                M-Pesa
              </TabsTrigger>
              <TabsTrigger value="voucher" className="flex items-center gap-2" data-testid="tab-voucher">
                <Ticket className="w-4 h-4" />
                Voucher
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mpesa" className="space-y-4 mt-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center mr-4">
                    <Smartphone className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-success">M-Pesa Payment</h4>
                    <p className="text-success/80 text-sm">Secure mobile payment</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleMpesaSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-2">
                    M-Pesa Phone Number
                  </Label>
                  <Input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full"
                    data-testid="input-phone-number"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-success text-white hover:bg-success/90 transition-colors flex items-center justify-center"
                  disabled={paymentMutation.isPending}
                  data-testid="button-pay-with-mpesa"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 w-4 h-4" />
                      Pay with M-Pesa
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  You will receive an M-Pesa prompt on your phone to complete the payment
                </p>
              </form>
            </TabsContent>

            <TabsContent value="voucher" className="space-y-4 mt-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-4">
                    <Ticket className="text-white text-xl" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Voucher Code</h4>
                    <p className="text-primary/80 text-sm">Already have a voucher?</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVoucherSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="voucherCode" className="block text-sm font-medium text-slate-700 mb-2">
                    Voucher Code
                  </Label>
                  <Input
                    type="text"
                    id="voucherCode"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Enter your voucher code"
                    className="w-full"
                    data-testid="input-voucher-code"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center"
                  disabled={voucherMutation.isPending}
                  data-testid="button-redeem-voucher"
                >
                  {voucherMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Ticket className="mr-2 w-4 h-4" />
                      Redeem Voucher
                    </>
                  )}
                </Button>

                <div className="text-xs text-slate-500">
                  <p className="font-medium mb-2">About voucher codes:</p>
                  <ul className="space-y-1">
                    <li>• Enter the voucher code exactly as provided</li>
                    <li>• Each voucher can only be used once</li>
                    <li>• Vouchers may have expiration dates</li>
                    <li>• You'll get instant internet access after redemption</li>
                  </ul>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
