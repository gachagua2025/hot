// Test script to verify callback URL detection
const fs = require('fs');

console.log('🧪 Testing callback URL detection...');

// Check if file exists
if (fs.existsSync('.ngrok-url')) {
  const ngrokUrl = fs.readFileSync('.ngrok-url', 'utf8').trim();
  console.log('✅ Found ngrok URL:', ngrokUrl);
  
  // Test the callback URL construction
  const callbackUrl = `${ngrokUrl}/api/payment/callback`;
  console.log('💳 M-Pesa callback URL:', callbackUrl);
  
  // Verify URL format
  if (ngrokUrl.startsWith('https://') && ngrokUrl.includes('ngrok')) {
    console.log('✅ URL format is valid');
    
    // Update the MpesaService to use this URL immediately
    console.log('🔄 The system should now use this URL for M-Pesa callbacks');
  } else {
    console.log('❌ Invalid URL format');
  }
} else {
  console.log('❌ .ngrok-url file not found');
}