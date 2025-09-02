import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Building } from 'lucide-react';

interface Bank {
  id: string;
  name: string;
  paybill: string;
  accountReference: string;
  transactionDesc: string;
}

interface PaymentGatewayConfigProps {
  providerId: string;
  providerName: string;
}

export default function PaymentGatewayConfig({ providerId, providerName }: PaymentGatewayConfigProps) {
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { toast } = useToast();

  // Fetch available banks
  const { data: banks, isLoading: banksLoading } = useQuery<Bank[]>({
    queryKey: ['/api/payment/banks'],
  });

  // Fetch provider's current payment configuration
  const { data: currentConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: [`/api/superadmin/providers/${providerId}/payment-config`],
    enabled: !!providerId,
  });

  // Configure payment gateway mutation
  const configurePaymentMutation = useMutation({
    mutationFn: async (data: { bankId: string; accountNumber: string }) => {
      const response = await apiRequest('POST', `/api/superadmin/providers/${providerId}/payment-gateway`, {
        bankId: data.bankId,
        accountNumber: data.accountNumber,
        environment: 'production',
        gatewayType: 'mpesa'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Payment Gateway Configured',
        description: `M-Pesa payment gateway has been successfully configured for ${providerName}`,
      });
      refetchConfig();
      setIsConfiguring(false);
      setSelectedBank('');
      setAccountNumber('');
    },
    onError: (error: any) => {
      toast({
        title: 'Configuration Failed',
        description: error.message || 'Failed to configure payment gateway',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBank || !accountNumber) {
      toast({
        title: 'Missing Information',
        description: 'Please select a bank and enter account number',
        variant: 'destructive',
      });
      return;
    }

    await configurePaymentMutation.mutateAsync({
      bankId: selectedBank,
      accountNumber: accountNumber,
    });
  };

  const selectedBankData = banks?.find(bank => bank.id === selectedBank);

  if (banksLoading || configLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
          <p className="mt-2 text-slate-600">Loading payment gateway configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Configuration Status */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Gateway Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentConfig && currentConfig.configured ? (
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Payment Gateway Active</p>
                <p className="text-sm text-slate-600">
                  Bank: {currentConfig?.bankName || 'Not specified'} | Account: {currentConfig?.accountNumber || 'Not specified'}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Payment Gateway Not Configured</p>
                <p className="text-sm text-slate-600">
                  Configure M-Pesa payment gateway for {providerName}
                </p>
              </div>
              <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Configure M-Pesa Payment Gateway</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bank-select">Select Bank *</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose bank for M-Pesa payments" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBankData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Paybill Number:</span>
                    <p className="text-blue-900">{selectedBankData.paybill}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Transaction Description:</span>
                    <p className="text-blue-900">{selectedBankData.transactionDesc}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="account-number">Account Number *</Label>
              <Input
                id="account-number"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter the account number where funds should be deposited"
                required
                data-testid="input-account-number"
              />
              <p className="text-sm text-slate-600 mt-1">
                This is where customer payments will be deposited
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsConfiguring(false);
                  setSelectedBank('');
                  setAccountNumber('');
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={configurePaymentMutation.isPending || !selectedBank || !accountNumber}
                data-testid="button-configure"
              >
                {configurePaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  'Configure Gateway'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Test Payment */}
      {currentConfig && currentConfig.configured && (
        <Card className="bg-green-50 border border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Test Payment Gateway</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              Payment gateway is active. You can now test payments through your captive portal.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-100">
                View Transaction Logs
              </Button>
              <Button variant="outline" className="text-green-700 border-green-300 hover:bg-green-100">
                Test STK Push
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}