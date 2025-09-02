#!/bin/bash

echo "Setting up test M-Pesa callback simulation..."

# Create a test ngrok URL for demonstration
TEST_NGROK_URL="https://test-callback-demo.ngrok-free.app"

# Save the test URL
echo "$TEST_NGROK_URL" > .ngrok-url

echo "✅ Test callback URL set: $TEST_NGROK_URL"
echo "✅ M-Pesa callbacks will use: $TEST_NGROK_URL/api/payment/callback"
echo ""
echo "🧪 This demonstrates how real-time callbacks work:"
echo "   1. Customer makes payment"
echo "   2. M-Pesa sends instant callback to your tunnel"
echo "   3. Payment processing stops polling immediately"
echo "   4. User is activated automatically on MikroTik routers"
echo ""
echo "💡 To use real ngrok:"
echo "   1. Sign up at ngrok.com for free auth token"
echo "   2. Run: ./ngrok config add-authtoken YOUR_TOKEN"
echo "   3. Run: ./ngrok http 5000"
echo "   4. Copy the https URL to .ngrok-url file"