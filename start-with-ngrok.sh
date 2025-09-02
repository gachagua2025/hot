#!/bin/bash

echo "Starting MikroTik Hotspot Management System with ngrok tunneling..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install ngrok
install_ngrok() {
    echo "Installing ngrok..."
    
    # Download ngrok for Linux
    curl -L "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" -o /tmp/ngrok.tgz
    
    # Extract and move to /usr/local/bin
    tar -xzf /tmp/ngrok.tgz -C /tmp/
    sudo mv /tmp/ngrok /usr/local/bin/ngrok
    rm /tmp/ngrok.tgz
    
    echo "✓ ngrok installed successfully"
}

# Function to start ngrok tunnel
start_ngrok() {
    echo "Starting ngrok tunnel on port 5000..."
    
    # Start ngrok in background and capture the URL
    ngrok http 5000 --log stdout > ngrok.log 2>&1 &
    NGROK_PID=$!
    
    # Wait for ngrok to start and get the URL
    echo "Waiting for ngrok to establish tunnel..."
    sleep 5
    
    # Get the public URL from ngrok API
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-z0-9\-]*\.ngrok-free\.app' | head -1)
    
    if [ -n "$NGROK_URL" ]; then
        echo "✓ ngrok tunnel active: $NGROK_URL"
        echo "✓ M-Pesa callback URL: $NGROK_URL/api/payment/callback"
        
        # Save the URL to a file for the application to use
        echo "$NGROK_URL" > .ngrok-url
        
        echo ""
        echo "🎉 System ready with ngrok tunneling!"
        echo "   - Application URL: $NGROK_URL"
        echo "   - Admin Dashboard: $NGROK_URL/admin"
        echo "   - M-Pesa callbacks will be received at: $NGROK_URL/api/payment/callback"
        echo ""
    else
        echo "✗ Failed to get ngrok URL"
        exit 1
    fi
}

# Check if ngrok is installed
if ! command_exists ngrok; then
    install_ngrok
fi

# Start ngrok tunnel
start_ngrok

# Start the application
echo "Starting the application..."
npm run dev

# Cleanup function
cleanup() {
    echo "Shutting down..."
    if [ -n "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
    fi
    rm -f .ngrok-url ngrok.log
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Keep the script running
wait