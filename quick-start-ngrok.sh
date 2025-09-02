#!/bin/bash

echo "🚀 Starting MikroTik Hotspot System with ngrok for M-Pesa callbacks..."
echo ""

# Function to check if ngrok is installed
check_ngrok() {
    if command -v ngrok >/dev/null 2>&1; then
        echo "✅ ngrok is installed"
        return 0
    else
        echo "❌ ngrok not found"
        return 1
    fi
}

# Function to install ngrok
install_ngrok() {
    echo "📦 Installing ngrok..."
    
    # Download and install ngrok
    curl -s -L "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" -o /tmp/ngrok.tgz
    tar -xzf /tmp/ngrok.tgz -C /tmp/
    sudo mv /tmp/ngrok /usr/local/bin/ngrok
    rm /tmp/ngrok.tgz
    
    echo "✅ ngrok installed successfully"
}

# Function to start ngrok tunnel
start_ngrok() {
    echo "🌐 Starting ngrok tunnel on port 5000..."
    
    # Start ngrok in background
    ngrok http 5000 --log stdout > ngrok.log 2>&1 &
    NGROK_PID=$!
    
    # Wait for tunnel to establish
    echo "⏳ Waiting for tunnel to establish..."
    sleep 8
    
    # Get the tunnel URL
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[a-z0-9\-]*\.ngrok-free\.app' | head -1)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo "✅ Tunnel active: $TUNNEL_URL"
        echo "💳 M-Pesa callback URL: $TUNNEL_URL/api/payment/callback"
        
        # Save URL for the application
        echo "$TUNNEL_URL" > .ngrok-url
        
        echo ""
        echo "🎉 System ready! Access your application at:"
        echo "   🌐 $TUNNEL_URL"
        echo "   ⚙️ Admin: $TUNNEL_URL/admin"
        echo ""
        echo "💡 M-Pesa payments will now work in real-time!"
        echo ""
        
        return 0
    else
        echo "❌ Failed to get tunnel URL"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🔄 Shutting down..."
    
    # Kill ngrok if running
    pkill -f "ngrok http 5000" 2>/dev/null
    
    # Clean up files
    rm -f .ngrok-url ngrok.log 2>/dev/null
    
    echo "✅ Cleanup complete"
    exit 0
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Main setup
main() {
    # Check if ngrok is installed
    if ! check_ngrok; then
        install_ngrok
    fi
    
    # Start ngrok tunnel
    if start_ngrok; then
        echo "▶️ Starting the application..."
        echo "📝 Server logs will appear below..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # Start the main application
        npm run dev
    else
        echo "❌ Failed to setup ngrok tunnel"
        exit 1
    fi
}

# Run main function
main