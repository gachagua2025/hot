import express from 'express';
import MpesaService from './mpesa-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const mpesaService = new MpesaService();

// Load banks data
router.get('/banks', (req, res) => {
  try {
    const banksData = fs.readFileSync(path.join(__dirname, '../banks.json'), 'utf8');
    const banks = JSON.parse(banksData);
    res.json(banks);
  } catch (error) {
    console.error('Error loading banks:', error);
    res.status(500).json({ error: 'Failed to load banks data' });
  }
});

// Get selected bank
router.get('/selected-bank', (req, res) => {
  try {
    const selectedBank = mpesaService.getSelectedBank();
    res.json(selectedBank);
  } catch (error) {
    console.error('Error getting selected bank:', error);
    res.status(500).json({ error: 'Failed to get selected bank' });
  }
});

// STK Push endpoint
router.post('/stkpush', async (req, res) => {
  try {
    const { phone, amount, accountReference } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ 
        error: 'Phone number and amount are required' 
      });
    }

    // Validate and format phone number
    const formattedPhone = mpesaService.formatPhoneNumber(phone);
    
    // Validate amount
    const validatedAmount = mpesaService.validateAmount(amount);

    console.log('Processing STK Push:', {
      phone: formattedPhone,
      amount: validatedAmount,
      accountReference
    });

    // Initiate STK Push
    const result = await mpesaService.stkPush(
      formattedPhone, 
      validatedAmount, 
      accountReference
    );

    res.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        merchantRequestId: result.MerchantRequestID,
        checkoutRequestId: result.CheckoutRequestID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
        customerMessage: result.CustomerMessage
      }
    });

  } catch (error) {
    console.error('STK Push Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'STK Push failed',
      message: 'Payment initiation failed. Please try again.'
    });
  }
});

// STK Push query endpoint
router.post('/stkquery', async (req, res) => {
  try {
    const { checkoutRequestId } = req.body;

    if (!checkoutRequestId) {
      return res.status(400).json({ 
        error: 'CheckoutRequestID is required' 
      });
    }

    console.log('Querying STK Push status:', checkoutRequestId);

    const result = await mpesaService.stkQuery(checkoutRequestId);

    res.json({
      success: true,
      data: {
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
        merchantRequestId: result.MerchantRequestID,
        checkoutRequestId: result.CheckoutRequestID,
        resultCode: result.ResultCode,
        resultDescription: result.ResultDesc
      }
    });

  } catch (error) {
    console.error('STK Query Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'STK Query failed',
      message: 'Failed to query payment status'
    });
  }
});

// Payment callback endpoint (for M-Pesa to call)
router.post('/callback', async (req, res) => {
  try {
    console.log('M-Pesa Callback received:', JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    
    if (Body && Body.stkCallback) {
      const callback = Body.stkCallback;
      console.log('STK Callback processed:', {
        merchantRequestId: callback.MerchantRequestID,
        checkoutRequestId: callback.CheckoutRequestID,
        resultCode: callback.ResultCode,
        resultDesc: callback.ResultDesc
      });
      
      // Find and update transaction in database
      const transaction = await storage.getTransactionByCheckoutRequestId(callback.CheckoutRequestID);
      
      if (transaction) {
        let newStatus;
        let resultMessage = callback.ResultDesc;
        
        if (callback.ResultCode === 0) {
          newStatus = 'completed';
          console.log('✅ Payment successful - granting internet access');
          // Grant internet access logic here
        } else {
          newStatus = 'failed';
          console.log('❌ Payment failed:', callback.ResultDesc);
        }
        
        // Update transaction status in database
        await storage.updateTransaction(transaction.id, {
          status: newStatus,
          resultCode: callback.ResultCode,
          resultDesc: resultMessage
        });
        
        console.log(`💾 Transaction ${transaction.id} updated to status: ${newStatus}`);
      } else {
        console.log('⚠️ Transaction not found for CheckoutRequestID:', callback.CheckoutRequestID);
      }
    }
    
    // Always respond with success to M-Pesa
    res.json({ 
      ResponseCode: "00000000", 
      ResponseDesc: "success" 
    });
    
  } catch (error) {
    console.error('Callback processing error:', error);
    // Still respond with success to avoid M-Pesa retries
    res.json({ 
      ResponseCode: "00000000", 
      ResponseDesc: "success" 
    });
  }
});

// Test connectivity endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payment service is running',
    selectedBank: mpesaService.getSelectedBank(),
    timestamp: new Date().toISOString()
  });
});

export default router;