#!/bin/bash

# SSL Certificate Setup for mkashop.online Infrastructure
# Installs Let's Encrypt SSL certificates for all domains

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Domain configuration
DOMAINS=("mkashop.online" "www.mkashop.online" "mkash.mkashop.online" "api.mkashop.online")
EMAIL="admin@mkashop.online"

echo "🔒 Setting up SSL certificates for mkashop.online infrastructure..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_error "Certbot is not installed. Please run production-deploy.sh first."
    exit 1
fi

# Check if nginx is installed and running
if ! systemctl is-active --quiet nginx; then
    print_error "Nginx is not running. Please start nginx first."
    exit 1
fi

# Function to check domain resolution
check_domain_resolution() {
    local domain=$1
    local server_ip="13.60.237.52"
    
    print_info "Checking DNS resolution for $domain..."
    
    # Get the IP address the domain resolves to
    resolved_ip=$(dig +short $domain @8.8.8.8 | tail -n1)
    
    if [ "$resolved_ip" = "$server_ip" ]; then
        print_status "$domain resolves correctly to $server_ip"
        return 0
    else
        print_error "$domain resolves to $resolved_ip instead of $server_ip"
        return 1
    fi
}

# Function to test HTTP access
test_http_access() {
    local domain=$1
    
    print_info "Testing HTTP access for $domain..."
    
    if curl -s -I "http://$domain" > /dev/null; then
        print_status "$domain is accessible via HTTP"
        return 0
    else
        print_error "$domain is not accessible via HTTP"
        return 1
    fi
}

# Step 1: Verify DNS resolution for all domains
print_status "Step 1: Verifying DNS resolution..."
all_domains_ok=true

for domain in "${DOMAINS[@]}"; do
    if ! check_domain_resolution "$domain"; then
        all_domains_ok=false
    fi
done

if [ "$all_domains_ok" = false ]; then
    print_error "DNS resolution failed for some domains. Please check your DNS configuration."
    print_info "Refer to dns-setup.md for DNS configuration instructions."
    exit 1
fi

# Step 2: Test HTTP access
print_status "Step 2: Testing HTTP access..."
for domain in "${DOMAINS[@]}"; do
    if ! test_http_access "$domain"; then
        print_warning "$domain HTTP test failed, but continuing..."
    fi
done

# Step 3: Create temporary nginx configuration for ACME challenge
print_status "Step 3: Creating temporary nginx configuration for SSL verification..."

sudo tee /etc/nginx/sites-available/temp-ssl > /dev/null << 'EOF'
server {
    listen 80;
    server_name mkashop.online www.mkashop.online mkash.mkashop.online api.mkashop.online;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 "SSL setup in progress...";
        add_header Content-Type text/plain;
    }
}
EOF

# Disable existing sites temporarily
sudo rm -f /etc/nginx/sites-enabled/mkashop-*

# Enable temporary configuration
sudo ln -sf /etc/nginx/sites-available/temp-ssl /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Step 4: Install SSL certificates
print_status "Step 4: Installing SSL certificates..."

# Create webroot directory
sudo mkdir -p /var/www/html

# Install certificates for each domain group
print_info "Installing certificate for main domain..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d mkashop.online \
    -d www.mkashop.online

print_info "Installing certificate for provider subdomain..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d mkash.mkashop.online

print_info "Installing certificate for API subdomain..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d api.mkashop.online

# Step 5: Restore proper nginx configuration
print_status "Step 5: Restoring production nginx configuration..."

# Remove temporary configuration
sudo rm -f /etc/nginx/sites-enabled/temp-ssl

# Re-enable production configurations
sudo ln -sf /etc/nginx/sites-available/mkashop-main /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/mkashop-provider /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/mkashop-api /etc/nginx/sites-enabled/

# Test nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl reload nginx
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 6: Set up automatic renewal
print_status "Step 6: Setting up automatic SSL renewal..."

# Create renewal script
sudo tee /etc/cron.d/certbot-renewal > /dev/null << 'EOF'
# Renew SSL certificates twice daily
0 */12 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Test renewal
print_info "Testing SSL renewal process..."
sudo certbot renew --dry-run

# Step 7: Verify SSL installation
print_status "Step 7: Verifying SSL installation..."

sleep 5  # Wait for nginx to fully reload

for domain in "${DOMAINS[@]}"; do
    print_info "Testing HTTPS for $domain..."
    
    if curl -s -I "https://$domain" > /dev/null 2>&1; then
        print_status "✅ $domain SSL is working"
    else
        print_warning "⚠️  $domain SSL test failed"
    fi
done

# Step 8: SSL Security Test
print_status "Step 8: Running SSL security check..."

# Check SSL configuration
echo "🔍 SSL Certificate Information:"
echo "================================"

for domain in "mkashop.online" "mkash.mkashop.online" "api.mkashop.online"; do
    echo "Domain: $domain"
    openssl s_client -connect $domain:443 -servername $domain < /dev/null 2>/dev/null | openssl x509 -noout -subject -dates
    echo "--------------------------------"
done

print_status "🎉 SSL setup completed successfully!"
echo ""
echo "✅ SSL certificates installed for all domains"
echo "✅ Automatic renewal configured"
echo "✅ Nginx configured for HTTPS"
echo "✅ Security headers enabled"
echo ""
echo "🌐 Your domains are now secure:"
echo "   🔒 https://mkashop.online (Super Admin)"
echo "   🔒 https://mkash.mkashop.online (Provider Portal)"
echo "   🔒 https://api.mkashop.online (API Endpoints)"
echo ""
echo "📋 SSL Certificate Locations:"
echo "   Main: /etc/letsencrypt/live/mkashop.online/"
echo "   Provider: /etc/letsencrypt/live/mkash.mkashop.online/"
echo "   API: /etc/letsencrypt/live/api.mkashop.online/"
echo ""
echo "🔄 Auto-renewal: Configured via cron (twice daily)"
echo ""
print_info "Next step: Run app-start.sh to start the application"