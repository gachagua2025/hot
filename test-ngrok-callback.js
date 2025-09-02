#!/usr/bin/env node

// Simple test script to verify ngrok callback functionality
const fs = require('fs');

console.log('🧪 Testing ngrok M-Pesa callback setup...');

// Check if ngrok URL file exists
if (fs.existsSync('.ngrok-url')) {
  const ngrokUrl = fs.readFileSync('.ngrok-url', 'utf8').trim();
  console.log(`✅ Found ngrok URL: ${ngrokUrl}`);
  console.log(`📲 M-Pesa callbacks will be sent to: ${ngrokUrl}/api/payment/callback`);
  
  // Test the callback endpoint
  const http = require('http');
  const url = require('url');
  
  const testUrl = `${ngrokUrl}/api/payment/callback`;
  console.log(`🔍 Testing callback endpoint: ${testUrl}`);
  
  // Create a simple POST request to test
  const parsedUrl = url.parse(testUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  const req = (parsedUrl.protocol === 'https:' ? require('https') : require('http')).request(options, (res) => {
    console.log(`📡 Callback endpoint response: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 400) {
      console.log('✅ Callback endpoint is accessible');
    } else {
      console.log('⚠️ Unexpected response from callback endpoint');
    }
  });
  
  req.on('error', (error) => {
    console.log(`❌ Cannot reach callback endpoint: ${error.message}`);
    console.log('💡 Make sure ngrok tunnel is running');
  });
  
  // Send test data
  req.write(JSON.stringify({ test: true }));
  req.end();
  
} else {
  console.log('❌ No ngrok URL found');
  console.log('💡 Run "./quick-start-ngrok.sh" to setup ngrok tunnel');
}