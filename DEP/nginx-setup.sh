#!/bin/bash

# Nginx Multi-Domain Configuration Setup
# For mkashop.online infrastructure

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🌐 Setting up Nginx configuration for mkashop.online domains..."

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Create rate limiting configuration
sudo tee /etc/nginx/conf.d/rate-limit.conf > /dev/null << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=payment:10m rate=20r/m;
EOF

# Main domain configuration (Super Admin)
sudo tee /etc/nginx/sites-available/mkashop-main > /dev/null << 'EOF'
# HTTP to HTTPS redirect for mkashop.online
server {
    listen 80;
    server_name mkashop.online www.mkashop.online;
    return 301 https://mkashop.online$request_uri;
}

# HTTPS configuration for mkashop.online (Super Admin)
server {
    listen 443 ssl http2;
    server_name mkashop.online www.mkashop.online;

    # SSL Configuration (will be updated after SSL setup)
    ssl_certificate /etc/letsencrypt/live/mkashop.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mkashop.online/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Super Admin routes only
    location /superadmin {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Block provider and regular admin access on main domain
    location /admin {
        return 403;
    }

    location / {
        return 301 https://mkash.mkashop.online$request_uri;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF

# Provider subdomain configuration
sudo tee /etc/nginx/sites-available/mkashop-provider > /dev/null << 'EOF'
# HTTP to HTTPS redirect for mkash.mkashop.online
server {
    listen 80;
    server_name mkash.mkashop.online;
    return 301 https://mkash.mkashop.online$request_uri;
}

# HTTPS configuration for mkash.mkashop.online (Provider Portal)
server {
    listen 443 ssl http2;
    server_name mkash.mkashop.online;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mkash.mkashop.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mkash.mkashop.online/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Captive portal (main page)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin portal for providers
    location /admin {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Block super admin access on provider domain
    location /superadmin {
        return 403;
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF

# API subdomain configuration
sudo tee /etc/nginx/sites-available/mkashop-api > /dev/null << 'EOF'
# HTTP to HTTPS redirect for api.mkashop.online
server {
    listen 80;
    server_name api.mkashop.online;
    return 301 https://api.mkashop.online$request_uri;
}

# HTTPS configuration for api.mkashop.online (API Only)
server {
    listen 443 ssl http2;
    server_name api.mkashop.online;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.mkashop.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mkashop.online/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers for API
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # CORS headers for API
    add_header 'Access-Control-Allow-Origin' 'https://mkash.mkashop.online' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;

    # API endpoints only
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # M-Pesa payment callbacks
    location /api/payment/callback {
        limit_req zone=payment burst=50 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }

    # Block all non-API requests
    location / {
        return 404;
    }
}
EOF

# Enable sites
print_status "Enabling Nginx site configurations..."
sudo ln -sf /etc/nginx/sites-available/mkashop-main /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/mkashop-provider /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/mkashop-api /etc/nginx/sites-enabled/

# Test configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid!"
    print_warning "SSL certificates need to be installed before reloading Nginx"
    print_warning "Run ssl-setup.sh after DNS configuration is complete"
else
    print_error "Nginx configuration test failed!"
    exit 1
fi

echo ""
echo "📋 Nginx Configuration Summary:"
echo "🌐 mkashop.online → Super Admin Panel"
echo "🏢 mkash.mkashop.online → Provider Portal & Captive Portal"
echo "🔌 api.mkashop.online → API Endpoints Only"
echo ""
echo "⚠️  Next steps:"
echo "1. Configure DNS records (see dns-setup.md)"
echo "2. Run ssl-setup.sh to install SSL certificates"
echo "3. sudo systemctl reload nginx"