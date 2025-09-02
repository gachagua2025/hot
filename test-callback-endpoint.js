
#!/usr/bin/env node

import https from 'https';
import http from 'http';
import fs from 'fs';

// Test if callback endpoint is accessible and working properly
async function testCallbackEndpoint() {
  console.log('🧪 Testing M-Pesa callback endpoint functionality...\n');
  
  // Get the current server URL
  const serverUrl = 'http://localhost:5000';
  const callbackUrl = `${serverUrl}/api/payment/callback`;
  
  console.log(`Testing callback endpoint: ${callbackUrl}`);
  
  // Test with valid callback data
  const successCallbackData = {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-123",
        CheckoutRequestID: "test-checkout-123", 
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 10.00 },
            { Name: "MpesaReceiptNumber", Value: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
            { Name: "TransactionDate", Value: parseInt(new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)) },
            { Name: "PhoneNumber", Value: 254723534293 }
          ]
        }
      }
    }
  };
  
  const testData = JSON.stringify(successCallbackData);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/payment/callback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}`);
        console.log(`📡 Response Body: ${body}`);
        
        try {
          const response = JSON.parse(body);
          if (res.statusCode === 200 && response.ResponseCode === "00000000") {
            console.log('✅ Callback endpoint is working correctly!');
            console.log('✅ Proper M-Pesa response format confirmed');
          } else {
            console.log('⚠️ Callback endpoint responded but format may be incorrect');
          }
        } catch (e) {
          console.log('⚠️ Response is not valid JSON');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Cannot reach callback endpoint: ${error.message}`);
      console.log('💡 Make sure the server is running on port 5000');
      resolve();
    });
    
    req.write(testData);
    req.end();
  });
}

// Test with failed callback
async function testFailedCallback() {
  console.log('\n🔍 Testing failed payment callback...\n');
  
  const failedCallbackData = {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-456",
        CheckoutRequestID: "test-checkout-456",
        ResultCode: 1032,
        ResultDesc: "[STK_CB - ]Request cancelled by user"
      }
    }
  };
  
  const testData = JSON.stringify(failedCallbackData);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/payment/callback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📡 Failed Payment Response Status: ${res.statusCode}`);
        console.log(`📡 Failed Payment Response Body: ${body}`);
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Error testing failed callback: ${error.message}`);
      resolve();
    });
    
    req.write(testData);
    req.end();
  });
}

// Run all tests
(async () => {
  console.log('🚀 Starting callback endpoint tests...\n');
  await testCallbackEndpoint();
  await testFailedCallback();
  console.log('\n✅ Callback endpoint tests completed!');
})();
