import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentProcessingProps {
  transactionId: string;
  selectedPlan: any;
  onComplete: (paymentResult?: { status: string; error?: string }) => void;
  onFail: (errorMessage: string) => void; // Added onFail prop
}

export default function PaymentProcessing({ transactionId, onComplete, onFail }: PaymentProcessingProps) {
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(true);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);
  const [pollingStopped, setPollingStopped] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to stop all polling immediately
  const stopPolling = useCallback((status: string) => {
    if (hasCompletedOnce || pollingStopped) {
      console.log('🛑 Polling already stopped, ignoring duplicate call');
      return; // Prevent duplicate calls
    }

    console.log(`🛑 Stopping polling with status: ${status}`);
    setShouldPoll(false);
    setPollingStopped(true);
    setHasCompletedOnce(true);
    setFinalStatus(status);

    // Invalidate and remove the query to prevent any further requests
    queryClient.invalidateQueries({ queryKey: ['/api/payment/status', transactionId] });
    queryClient.removeQueries({ queryKey: ['/api/payment/status', transactionId] });
  }, [hasCompletedOnce, pollingStopped, queryClient, transactionId]);

  const { data: paymentStatus, isLoading } = useQuery({
    queryKey: ['/api/payment/status', transactionId],
    queryFn: async () => {
      // Prevent any requests if polling has been stopped
      if (pollingStopped || finalStatus || hasCompletedOnce || !shouldPoll) {
        console.log('🚫 Polling stopped, skipping request');
        throw new Error('Polling stopped'); // Throw error to prevent further requests
      }

      console.log('🔄 Checking payment status...');
      const response = await fetch(`/api/payment/status/${transactionId}`);
      if (!response.ok) {
        throw new Error('Network error or server issue');
      }
      const data = await response.json();
      console.log('📊 Payment status response:', data);

      // Immediately stop polling if we get a final status
      if (data.status === 'completed' || data.status === 'failed') {
        console.log(`🛑 Got final status ${data.status}, stopping polling immediately`);
        setShouldPoll(false);
        setPollingStopped(true);
        setHasCompletedOnce(true);
        setFinalStatus(data.status);
      }

      return data;
    },
    refetchInterval: (query) => {
      // Aggressively check all stopping conditions
      if (!shouldPoll || finalStatus || hasCompletedOnce || pollingStopped || timeoutReached) {
        console.log('🛑 Polling disabled - stopping immediately');
        return false;
      }

      // Check current status in query data
      const currentStatus = query.state.data?.status;
      
      // Stop immediately for any final status
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        console.log(`🛑 Final status ${currentStatus} detected - stopping polling`);
        return false;
      }

      // Only continue for pending status
      if (currentStatus === 'pending') {
        return 1500; // Poll every 1.5 seconds for pending status only
      }

      // Stop for any other status or no status
      console.log('🛑 Non-pending status or no status - stopping polling');
      return false;
    },
    enabled: !!transactionId && shouldPoll && !finalStatus && !hasCompletedOnce && !pollingStopped && !timeoutReached,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });

  // Set timeout for payment processing (2 minutes)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutReached(true);
      setShouldPoll(false);
      setFinalStatus('timeout');
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, []);

  // Handle status changes and stop polling immediately
  useEffect(() => {
    if (!paymentStatus || hasCompletedOnce || pollingStopped) return;

    const status = paymentStatus.status;

    if (status === 'completed') {
      console.log('✅ Payment completed - processing success');

      toast({
        title: "Payment Successful!",
        description: "Your internet access has been activated.",
      });

      // Call onComplete immediately
      onComplete({ status: 'completed' });

    } else if (status === 'failed') {
      console.log('❌ Payment failed - processing failure');

      toast({
        title: "Payment Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });

      // Call onComplete immediately  
      onComplete({ status: 'failed', error: paymentStatus.error || 'Payment failed' });

    } else if (status === 'pending') {
      console.log('⏳ Payment still pending');
    }
  }, [paymentStatus?.status, hasCompletedOnce, pollingStopped, onComplete, toast]);

  // Handle timeout separately
  useEffect(() => {
    if (timeoutReached && !hasCompletedOnce && !pollingStopped) {
      console.log('⏰ Payment timed out - stopping all polling');
      stopPolling('timeout');

      toast({
        title: "Payment Timeout",
        description: "Please check your payment status or try again.",
        variant: "destructive",
      });

      onComplete({ status: 'timeout', error: 'Payment processing timed out' });
    }
  }, [timeoutReached, hasCompletedOnce, pollingStopped, toast, onComplete, stopPolling]);


  const getStatusIcon = () => {
    if (finalStatus === 'completed' || paymentStatus?.status === 'completed') {
      return <CheckCircle className="text-green-600 text-2xl" />;
    } else if (finalStatus === 'failed' || paymentStatus?.status === 'failed') {
      return <XCircle className="text-red-600 text-2xl" />;
    } else if (timeoutReached || finalStatus === 'timeout') {
      return <XCircle className="text-yellow-600 text-2xl" />;
    } else {
      return <Loader2 className="text-blue-600 text-2xl animate-spin" />;
    }
  };

  const getStatusMessage = () => {
    if (finalStatus === 'completed' || paymentStatus?.status === 'completed') {
      return {
        title: "Payment Successful!",
        description: "You are now connected to the internet",
        color: "text-green-600",
        showCloseButton: true,
      };
    } else if (finalStatus === 'failed' || paymentStatus?.status === 'failed') {
      return {
        title: "Payment Failed",
        description: "Please try again or contact support.",
        color: "text-red-600",
        showCloseButton: true,
      };
    } else if (timeoutReached || finalStatus === 'timeout') {
      return {
        title: "Payment Timeout",
        description: "Please check your payment status or try again.",
        color: "text-yellow-600",
        showCloseButton: true,
      };
    } else {
      return {
        title: "Processing Payment...",
        description: "Please check your phone and enter your M-Pesa PIN",
        color: "text-blue-600",
        showCloseButton: false,
      };
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            {getStatusIcon()}
          </div>

          <h3 className={`text-xl font-semibold mb-2 ${statusMessage.color}`} data-testid="text-payment-status-title">
            {statusMessage.title}
          </h3>

          <p className="text-slate-600 mb-4" data-testid="text-payment-status-description">
            {statusMessage.description}
          </p>

          {/* Success State - Internet Connected */}
          {(finalStatus === 'completed' || paymentStatus?.status === 'completed') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="text-green-600 text-4xl" />
              </div>
              <p className="text-green-800 font-semibold text-lg">
                🎉 Welcome to the Internet!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Your connection is now active. Enjoy browsing!
              </p>
            </div>
          )}

          {/* Processing State Instructions */}
          {!finalStatus && paymentStatus?.status === 'pending' && !timeoutReached && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Step 1:</strong> Check your phone for M-Pesa prompt<br />
                <strong>Step 2:</strong> Enter your M-Pesa PIN<br />
                <strong>Step 3:</strong> Wait for confirmation
              </p>
            </div>
          )}

          {/* Close Button for Final States */}
          {statusMessage.showCloseButton && (
            <Button
              onClick={() => {
                if (finalStatus === 'completed') {
                  onComplete({ status: 'completed' });
                } else if (finalStatus === 'failed') {
                  onComplete({ status: 'failed', error: paymentStatus?.error || 'Payment failed' });
                } else if (finalStatus === 'timeout') {
                  onComplete({ status: 'timeout', error: 'Payment processing timed out' });
                } else {
                  onComplete();
                }
              }}
              className="mt-4 w-full"
              data-testid="button-close-payment-processing"
              variant={finalStatus === 'completed' ? 'default' : 'outline'}
            >
              {finalStatus === 'completed' ? 'Start Browsing' : 'Close'}
            </Button>
          )}

          {/* Auto-redirect message for success */}
          {(finalStatus === 'completed' || paymentStatus?.status === 'completed') && (
            <div className="text-sm text-slate-600 mt-4">
              <p>Click "Start Browsing" to begin using the internet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}