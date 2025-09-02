# Setting up ngrok for M-Pesa Real-time Callbacks

## Quick Start

To enable real-time M-Pesa payment processing with ngrok tunneling:

### Option 1: Automatic Setup (Recommended)
```bash
# Make the script executable
chmod +x start-with-ngrok.sh

# Start the system with ngrok
./start-with-ngrok.sh
```

### Option 2: Manual Setup
```bash
# 1. Install ngrok (if not already installed)
curl -L "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" -o /tmp/ngrok.tgz
tar -xzf /tmp/ngrok.tgz -C /tmp/
sudo mv /tmp/ngrok /usr/local/bin/ngrok
rm /tmp/ngrok.tgz

# 2. Start ngrok tunnel (in separate terminal)
ngrok http 5000

# 3. Copy the https URL and save it to .ngrok-url file
echo "https://YOUR-NGROK-URL.ngrok-free.app" > .ngrok-url

# 4. Start the application
npm run dev
```

### Option 3: Node.js Script
```bash
# Start ngrok tunnel using Node.js script
node scripts/ngrok-tunnel.js

# In another terminal, start the application
npm run dev
```

## How it Works

1. **Dynamic Callback URL**: The M-Pesa service automatically detects the ngrok URL from `.ngrok-url` file
2. **Real-time Processing**: M-Pesa sends callbacks directly to your ngrok tunnel
3. **Automatic Polling Stop**: Payment status polling stops immediately when callback is received
4. **User Activation**: Successful payments automatically activate users on MikroTik routers

## Benefits

- **Real-time payments**: No more waiting for manual confirmation
- **Automatic user activation**: Hotspot users are enabled immediately after payment
- **Better user experience**: Payment processing modal closes automatically
- **Production-ready**: Works with actual M-Pesa production environment

## Files Modified

- `server/services/mpesa.ts` - Dynamic callback URL detection
- `scripts/ngrok-tunnel.js` - Automated ngrok setup
- `start-with-ngrok.sh` - Complete startup script
- `.ngrok-url` - Contains current tunnel URL (auto-generated)

## Environment Variables

Your current M-Pesa configuration will work with ngrok automatically. The system prioritizes:
1. ngrok URL (from `.ngrok-url` file)
2. Environment variable `MPESA_CALLBACK_URL`
3. Default fallback URL

## Testing

1. Start the system with ngrok
2. Access the captive portal via the ngrok URL
3. Make a test payment
4. Watch real-time callback processing in server logs
5. Verify automatic user activation

## Troubleshooting

- **ngrok not found**: Run the installation commands above
- **Tunnel not working**: Check `.ngrok-url` file exists and contains valid URL
- **Callbacks not received**: Ensure ngrok tunnel is active and accessible