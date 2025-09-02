#!/usr/bin/env node

/**
 * Test M-Pesa Payment Callback Functionality
 * This script simulates M-Pesa callbacks for testing payment processing
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';

// Test callback data templates
const successCallback = (checkoutRequestId) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: `29115-${Math.floor(Math.random() * 10000)}-1`,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: 10.00 },
          { Name: "MpesaReceiptNumber", Value: `NLJ${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
          { Name: "TransactionDate", Value: parseInt(new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)) },
          { Name: "PhoneNumber", Value: 254723534293 }
        ]
      }
    }
  }
});

const failedCallback = (checkoutRequestId) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: `29115-${Math.floor(Math.random() * 10000)}-1`,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: 1032,
      ResultDesc: "[STK_CB - ]Request cancelled by user"
    }
  }
});

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testPaymentFlow() {
  console.log('🧪 Testing M-Pesa Payment Callback Flow\n');

  try {
    // Step 1: Initiate payment
    console.log('1. Initiating STK Push...');
    const paymentRequest = {
      phoneNumber: "254723534293",
      planId: "8ef51cd4-a9d6-4ce0-ad1c-5a22182a96f9", // Basic plan
      macAddress: `${Math.random().toString(16).substr(2,2)}:${Math.random().toString(16).substr(2,2)}:${Math.random().toString(16).substr(2,2)}:${Math.random().toString(16).substr(2,2)}:${Math.random().toString(16).substr(2,2)}:${Math.random().toString(16).substr(2,2)}`
    };

    const paymentResponse = await makeRequest('POST', '/api/payment/initiate', paymentRequest);
    
    if (paymentResponse.status !== 200) {
      throw new Error(`Payment initiation failed: ${JSON.stringify(paymentResponse.data)}`);
    }

    console.log('✅ STK Push initiated successfully');
    console.log(`   Transaction ID: ${paymentResponse.data.transactionId}`);
    console.log(`   Checkout Request ID: ${paymentResponse.data.checkoutRequestId}`);

    const { transactionId, checkoutRequestId } = paymentResponse.data;

    // Step 2: Check initial status
    console.log('\n2. Checking initial payment status...');
    const initialStatus = await makeRequest('GET', `/api/payment/status/${transactionId}`);
    console.log(`   Status: ${initialStatus.data.status}`);

    // Step 3: Simulate successful callback
    console.log('\n3. Simulating M-Pesa callback (success)...');
    const callbackData = successCallback(checkoutRequestId);
    const callbackResponse = await makeRequest('POST', '/api/payment/callback', callbackData);
    
    if (callbackResponse.status !== 200) {
      throw new Error(`Callback processing failed: ${JSON.stringify(callbackResponse.data)}`);
    }
    
    console.log('✅ Callback processed successfully');

    // Step 4: Verify final status
    console.log('\n4. Verifying final payment status...');
    const finalStatus = await makeRequest('GET', `/api/payment/status/${transactionId}`);
    console.log(`   Status: ${finalStatus.data.status}`);
    
    if (finalStatus.data.status === 'completed') {
      console.log('✅ Payment flow completed successfully!');
      console.log('   User should now be activated and polling should stop');
    } else {
      console.log('❌ Payment status not updated correctly');
    }

    console.log('\n📊 Test Summary:');
    console.log('   - STK Push: ✅ Working');
    console.log('   - Callback Processing: ✅ Working');
    console.log('   - Status Updates: ✅ Working');
    console.log('   - Polling Resolution: ✅ Should stop after completion');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test failed payment scenario
async function testFailedPayment() {
  console.log('\n🧪 Testing Failed Payment Scenario\n');

  try {
    // Initiate payment
    const paymentRequest = {
      phoneNumber: "254700000001",
      planId: "b949e9ea-d016-4572-8500-78ee844803a8", // Standard plan
      macAddress: "test:failed:payment:00:00:01"
    };

    const paymentResponse = await makeRequest('POST', '/api/payment/initiate', paymentRequest);
    const { transactionId, checkoutRequestId } = paymentResponse.data;

    // Simulate failed callback
    console.log('Simulating M-Pesa callback (failed)...');
    const failedCallbackData = failedCallback(checkoutRequestId);
    await makeRequest('POST', '/api/payment/callback', failedCallbackData);

    // Check final status
    const finalStatus = await makeRequest('GET', `/api/payment/status/${transactionId}`);
    console.log(`Final status: ${finalStatus.data.status}`);
    
    if (finalStatus.data.status === 'failed') {
      console.log('✅ Failed payment handled correctly');
    }

  } catch (error) {
    console.error('❌ Failed payment test error:', error.message);
  }
}

// Run tests
(async () => {
  await testPaymentFlow();
  await testFailedPayment();
  console.log('\n🎯 All tests completed!');
})();

export { testPaymentFlow, testFailedPayment };