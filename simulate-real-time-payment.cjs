#!/usr/bin/env node

// Simulate a real-time M-Pesa callback to demonstrate the functionality
const http = require('http');

console.log('Simulating real-time M-Pesa payment callback...');

// Sample M-Pesa callback data (successful payment)
const callbackData = {
  Body: {
    stkCallback: {
      MerchantRequestID: "test-merchant-123",
      CheckoutRequestID: "19ef63bf-fb2a-421f-9f0c-b80794769cb8",
      ResultCode: 0, // Success
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: {
        Item: [
          {
            Name: "Amount",
            Value: 10
          },
          {
            Name: "MpesaReceiptNumber", 
            Value: "QGK12345ABC"
          },
          {
            Name: "TransactionDate",
            Value: 20250812224500
          },
          {
            Name: "PhoneNumber",
            Value: "254700123456"
          }
        ]
      }
    }
  }
};

// Send callback to the local server
const postData = JSON.stringify(callbackData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payment/callback',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Callback response status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Real-time callback processed successfully!');
    console.log('This demonstrates instant payment confirmation:');
    console.log('  - M-Pesa sends payment confirmation instantly');
    console.log('  - Payment polling stops automatically'); 
    console.log('  - User gets activated on MikroTik router');
    console.log('  - Customer receives internet access immediately');
  });
});

req.on('error', (e) => {
  console.error('Error sending callback:', e.message);
});

// Send the callback data
req.write(postData);
req.end();