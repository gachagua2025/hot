import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MpesaService {
  constructor() {
    this.banks = this.loadBanks();
    this.selectedBank = process.env.SELECTED_BANK || 'equity';
    this.mpesaConfig = {
      consumerKey: process.env.MPESA_CONSUMER_KEY,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET,
      environment: process.env.MPESA_ENVIRONMENT || 'production',
      passkey: process.env.MPESA_PASSKEY,
      shortcode: process.env.MPESA_SHORTCODE
    };
  }

  loadBanks() {
    try {
      const banksData = fs.readFileSync(path.join(__dirname, '../banks.json'), 'utf8');
      return JSON.parse(banksData);
    } catch (error) {
      console.error('Error loading banks data:', error);
      return [];
    }
  }

  getSelectedBank() {
    return this.banks.find(bank => bank.id === this.selectedBank) || this.banks[0];
  }

  async generateAccessToken() {
    const auth = Buffer.from(`${this.mpesaConfig.consumerKey}:${this.mpesaConfig.consumerSecret}`).toString('base64');
    
    try {
      const response = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
        }
      });
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate M-Pesa access token');
    }
  }

  async stkPush(phone, amount, accountReference = null) {
    try {
      const accessToken = await this.generateAccessToken();
      const bank = this.getSelectedBank();
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      
      // Use bank paybill or fallback to config shortcode
      const businessShortCode = bank.paybill || this.mpesaConfig.shortcode;
      
      // Generate password
      const password = Buffer.from(
        `${businessShortCode}${this.mpesaConfig.passkey}${timestamp}`
      ).toString('base64');

      const stkPushData = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // Ensure whole number
        PartyA: phone.replace(/^\+/, ''), // Remove + if present
        PartyB: businessShortCode,
        PhoneNumber: phone.replace(/^\+/, ''),
        CallBackURL: `${process.env.CALLBACK_BASE_URL || 'https://your-domain.com'}/api/payment/callback`,
        AccountReference: accountReference || bank.accountReference || 'Hotspot Payment',
        TransactionDesc: bank.transactionDesc || 'Hotspot Internet Payment'
      };

      console.log('STK Push Data:', JSON.stringify(stkPushData, null, 2));

      const response = await axios.post(
        'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        stkPushData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('STK Push Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      throw new Error(`STK Push failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  async stkQuery(checkoutRequestID) {
    try {
      const accessToken = await this.generateAccessToken();
      const bank = this.getSelectedBank();
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const businessShortCode = bank.paybill || this.mpesaConfig.shortcode;
      
      const password = Buffer.from(
        `${businessShortCode}${this.mpesaConfig.passkey}${timestamp}`
      ).toString('base64');

      const queryData = {
        BusinessShortCode: businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        queryData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('STK Query Error:', error.response?.data || error.message);
      throw new Error(`STK Query failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  validateAmount(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      throw new Error('Amount must be a positive number greater than 0');
    }
    if (numAmount > 70000) {
      throw new Error('Amount cannot exceed KES 70,000');
    }
    return Math.round(numAmount);
  }
}

export default MpesaService;