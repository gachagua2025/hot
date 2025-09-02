interface PayoutRequest {
  providerId: string;
  amount: number;
  transactionReference: string;
  paymentGateway: {
    type: string;
    paybill: string;
    accountNumber: string;
    transactionDesc: string;
  };
}

interface B2BRequest {
  Initiator: string;
  SecurityCredential: string;
  CommandID: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  AccountReference: string;
  Occasion: string;
}

interface B2BResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

export class PayoutService {
  private consumerKey: string;
  private consumerSecret: string;
  private businessShortCode: string;
  private initiator: string;
  private securityCredential: string;
  private environment: 'sandbox' | 'production';
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || '';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || '';
    this.initiator = process.env.MPESA_INITIATOR || 'testapi';
    this.securityCredential = process.env.MPESA_SECURITY_CREDENTIAL || '';
    this.environment = (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
  }

  private getBaseUrl(): string {
    return this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken!;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    try {
      const response = await fetch(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      // Set expiry to 55 minutes from now (tokens expire in 1 hour)
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error);
      throw error;
    }
  }

  async processAutomaticPayout(payoutRequest: PayoutRequest): Promise<boolean> {
    try {
      console.log('Processing automatic payout:', {
        providerId: payoutRequest.providerId,
        amount: payoutRequest.amount,
        gateway: payoutRequest.paymentGateway.type,
        paybill: payoutRequest.paymentGateway.paybill
      });

      // Determine payout method based on payment gateway type
      if (payoutRequest.paymentGateway.type === 'mobile_money' || payoutRequest.paymentGateway.type === 'mpesa') {
        return await this.sendMobileMoneyPayout(payoutRequest);
      } else if (payoutRequest.paymentGateway.type === 'bank') {
        return await this.sendBankPayout(payoutRequest);
      } else {
        console.log('Unknown gateway type, skipping payout:', payoutRequest.paymentGateway.type);
        return false;
      }
    } catch (error) {
      console.error('Error processing automatic payout:', error);
      return false;
    }
  }

  private async sendMobileMoneyPayout(payoutRequest: PayoutRequest): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Calculate provider fee (e.g., 80% of payment goes to provider, 20% platform fee)
      const providerAmount = Math.floor(payoutRequest.amount * 0.8);
      
      const b2bRequest: B2BRequest = {
        Initiator: this.initiator,
        SecurityCredential: this.securityCredential,
        CommandID: "BusinessPayBill",
        Amount: providerAmount,
        PartyA: this.businessShortCode,
        PartyB: payoutRequest.paymentGateway.paybill,
        Remarks: `Automatic payout for transaction ${payoutRequest.transactionReference}`,
        QueueTimeOutURL: `https://c6112fe6-b908-4fb8-a945-4c65b6e5fab6-00-1zp47b2w35ifc.kirk.replit.dev/api/payment/payout/timeout`,
        ResultURL: `https://c6112fe6-b908-4fb8-a945-4c65b6e5fab6-00-1zp47b2w35ifc.kirk.replit.dev/api/payment/payout/result`,
        AccountReference: payoutRequest.paymentGateway.accountNumber,
        Occasion: "Provider Payout"
      };

      const response = await fetch(`${this.getBaseUrl()}/mpesa/b2b/v1/paymentrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(b2bRequest)
      });

      if (!response.ok) {
        throw new Error(`B2B request failed: ${response.status} ${response.statusText}`);
      }

      const result: B2BResponse = await response.json();
      console.log('Mobile money payout initiated:', result);
      
      return result.ResponseCode === '0';
    } catch (error) {
      console.error('Error sending mobile money payout:', error);
      return false;
    }
  }

  private async sendBankPayout(payoutRequest: PayoutRequest): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Calculate provider fee (e.g., 80% of payment goes to provider, 20% platform fee)
      const providerAmount = Math.floor(payoutRequest.amount * 0.8);
      
      const b2bRequest: B2BRequest = {
        Initiator: this.initiator,
        SecurityCredential: this.securityCredential,
        CommandID: "BusinessPayBill", // Use PayBill for bank transfers
        Amount: providerAmount,
        PartyA: this.businessShortCode,
        PartyB: payoutRequest.paymentGateway.paybill, // Bank's paybill number
        Remarks: `Bank payout for transaction ${payoutRequest.transactionReference}`,
        QueueTimeOutURL: `https://c6112fe6-b908-4fb8-a945-4c65b6e5fab6-00-1zp47b2w35ifc.kirk.replit.dev/api/payment/payout/timeout`,
        ResultURL: `https://c6112fe6-b908-4fb8-a945-4c65b6e5fab6-00-1zp47b2w35ifc.kirk.replit.dev/api/payment/payout/result`,
        AccountReference: payoutRequest.paymentGateway.accountNumber, // Provider's bank account
        Occasion: "Provider Bank Payout"
      };

      const response = await fetch(`${this.getBaseUrl()}/mpesa/b2b/v1/paymentrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(b2bRequest)
      });

      if (!response.ok) {
        throw new Error(`B2B bank payout failed: ${response.status} ${response.statusText}`);
      }

      const result: B2BResponse = await response.json();
      console.log('Bank payout initiated:', result);
      
      return result.ResponseCode === '0';
    } catch (error) {
      console.error('Error sending bank payout:', error);
      return false;
    }
  }

  // Calculate provider's share of payment
  calculateProviderShare(totalAmount: number, platformFeePercentage: number = 20): number {
    const providerPercentage = 100 - platformFeePercentage;
    return Math.floor(totalAmount * (providerPercentage / 100));
  }
}

export const payoutService = new PayoutService();