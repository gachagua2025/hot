interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

interface StkPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface MpesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export class MpesaService {
  private config: MpesaConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private ngrokUrl: string | null = null;

  constructor() {
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '',
      passkey: process.env.MPESA_PASSKEY || '',
      callbackUrl: this.getCallbackUrl(),
      environment: (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    // Validate configuration
    this.validateConfig();
  }

  private validateConfig(): void {
    const requiredFields = [
      'consumerKey',
      'consumerSecret',
      'businessShortCode',
      'passkey'
    ];

    const missingFields = requiredFields.filter(field => !this.config[field as keyof MpesaConfig]);
    
    if (missingFields.length > 0) {
      console.warn('⚠️ Missing M-Pesa configuration:', missingFields);
      console.log('M-Pesa Config Status:', {
        consumerKey: this.config.consumerKey ? '✓ Set' : '✗ Missing',
        consumerSecret: this.config.consumerSecret ? '✓ Set' : '✗ Missing',
        businessShortCode: this.config.businessShortCode ? '✓ Set' : '✗ Missing',
        passkey: this.config.passkey ? '✓ Set' : '✗ Missing',
        environment: this.config.environment,
        callbackUrl: this.config.callbackUrl
      });
      console.warn('⚠️ M-Pesa service will be unavailable until configuration is provided');
      return; // Don't throw error, just warn
    }

    console.log('✅ M-Pesa configuration validated');
    console.log('Environment:', this.config.environment);
    console.log('Business Short Code:', this.config.businessShortCode);
  }

  private getCallbackUrl(): string {
    // First check if there's a cached ngrok URL
    if (this.ngrokUrl) {
      return `${this.ngrokUrl}/api/payment/callback`;
    }
    
    try {
      // Read ngrok URL from file using dynamic import to avoid ES module issues
      const fs = require('fs');
      const ngrokUrlFile = '.ngrok-url';
      
      if (fs.existsSync(ngrokUrlFile)) {
        let ngrokUrl = fs.readFileSync(ngrokUrlFile, 'utf8').trim();
        if (ngrokUrl && ngrokUrl.startsWith('https://')) {
          // Clean up the URL - remove any trailing slashes and fix malformed URLs
          ngrokUrl = ngrokUrl.replace(/\/+$/, ''); // Remove trailing slashes
          ngrokUrl = ngrokUrl.replace(/api\/payment\/callback.*$/, ''); // Remove any existing callback path
          
          // Ensure it's a valid ngrok URL
          if (ngrokUrl.includes('ngrok') || ngrokUrl.includes('replit.dev')) {
            this.ngrokUrl = ngrokUrl; // Cache the URL
            const callbackUrl = `${ngrokUrl}/api/payment/callback`;
            console.log(`✅ Using callback URL: ${callbackUrl}`);
            return callbackUrl;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Error reading ngrok URL, using fallback');
    }
    
    // Fallback to environment variable or Replit URL
    let envUrl = process.env.MPESA_CALLBACK_URL;
    
    // If no environment URL, use current Replit URL
    if (!envUrl) {
      const replitUrl = process.env.REPL_SLUG && process.env.REPL_OWNER 
        ? `https://${process.env.REPL_ID}.${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`
        : 'https://083aec1a-f1e0-401e-94ec-ea27e85f2938-00-2u73f9briin5y.spock.replit.dev/';
      
      envUrl = `${replitUrl}/api/payment/callback`;
    }
    
    console.log(`🌐 Using callback URL: ${envUrl}`);
    return envUrl;
  }

  private getBaseUrl(): string {
    return this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
    
    console.log('🔑 Requesting M-Pesa access token...');
    console.log('Environment:', this.config.environment);
    console.log('Base URL:', this.getBaseUrl());
    
    try {
      const response = await fetch(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('M-Pesa token error response:', errorText);
        throw new Error(`Failed to get M-Pesa access token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Token response:', data);
      
      if (!data.access_token) {
        throw new Error('No access token in M-Pesa response');
      }

      this.accessToken = data.access_token;
      
      // Token expires in 1 hour, set expiry to 55 minutes from now
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      
      console.log('✅ M-Pesa access token obtained successfully');
      return this.accessToken!;
    } catch (error) {
      console.error('❌ M-Pesa access token error:', error);
      throw error;
    }
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(
      `${this.config.businessShortCode}${this.config.passkey}${timestamp}`
    ).toString('base64');
    
    return { password, timestamp };
  }

  async initiateStkPush(phoneNumber: string, amount: number, accountReference: string): Promise<StkPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      
      // Format phone number to international format
      let formattedPhone = phoneNumber.startsWith('254') 
        ? phoneNumber 
        : phoneNumber.replace(/^0/, '254');

      // Use sandbox test numbers for testing if in sandbox environment
      if (this.config.environment === 'sandbox') {
        // M-Pesa sandbox test numbers with simulated balance
        const testNumbers = ['254708374149', '254711097973', '254733199001'];
        console.log('🧪 Sandbox mode: Using test phone number for reliable testing');
        formattedPhone = testNumbers[0]; // Use first test number
      }

      const stkPushData: StkPushRequest = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.config.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.getCallbackUrl(),
        AccountReference: accountReference,
        TransactionDesc: `Payment for ${accountReference}`,
      };

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`M-Pesa STK Push failed: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('M-Pesa STK Push error:', error);
      throw error;
    }
  }

  async queryStkStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const queryData = {
        BusinessShortCode: this.config.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await fetch(`${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryData),
      });

      if (!response.ok) {
        throw new Error('Failed to query STK status');
      }

      return await response.json();
    } catch (error) {
      console.error('M-Pesa STK query error:', error);
      throw error;
    }
  }

  parseCallbackData(callbackData: MpesaCallbackData): {
    success: boolean;
    mpesaReceiptNumber?: string;
    phoneNumber?: string;
    amount?: number;
    transactionDate?: Date;
    error?: string;
  } {
    const { stkCallback } = callbackData.Body;
    
    if (stkCallback.ResultCode !== 0) {
      return {
        success: false,
        error: stkCallback.ResultDesc,
      };
    }

    if (!stkCallback.CallbackMetadata) {
      return {
        success: false,
        error: 'No callback metadata received',
      };
    }

    const metadata = stkCallback.CallbackMetadata.Item;
    const getMetadataValue = (name: string) => {
      const item = metadata.find(item => item.Name === name);
      return item ? item.Value : null;
    };

    return {
      success: true,
      mpesaReceiptNumber: getMetadataValue('MpesaReceiptNumber') as string,
      phoneNumber: getMetadataValue('PhoneNumber') as string,
      amount: getMetadataValue('Amount') as number,
      transactionDate: new Date(getMetadataValue('TransactionDate') as string),
    };
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.slice(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    throw new Error('Invalid phone number format');
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      return /^254[17]\d{8}$/.test(formatted);
    } catch {
      return false;
    }
  }
}

export const mpesaService = new MpesaService();
