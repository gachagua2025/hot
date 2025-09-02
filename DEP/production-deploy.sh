#!/bin/bash

# Production Deployment Script for MikroTik Hotspot Management System
# AWS Ubuntu 24 VM - mkashop.online Infrastructure
# Server IP: 13.60.237.52

set -e  # Exit on any error

echo "🚀 Starting production deployment for mkashop.online infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_MAIN="mkashop.online"
DOMAIN_PROVIDER="mkash.mkashop.online"
DOMAIN_API="api.mkashop.online"
SERVER_IP="13.60.237.52"
PROJECT_DIR="/var/www/hotspot"
NEON_DB_URL="postgresql://neondb_owner:npg_r1ZzHIVQ0bLx@ep-plain-silence-afjvbi6v.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Please do not run this script as root"
   exit 1
fi

print_info "Deployment Configuration:"
echo "📍 Server IP: $SERVER_IP"
echo "🌍 Main Domain: $DOMAIN_MAIN (Super Admin)"
echo "🏢 Provider Domain: $DOMAIN_PROVIDER"
echo "🔌 API Domain: $DOMAIN_API"
echo "📁 Project Directory: $PROJECT_DIR"
echo ""

# Step 1: System Update
print_status "Step 1: Updating Ubuntu 24 system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js 20.x
if ! command -v node &> /dev/null; then
    print_status "Step 2: Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Step 2: Node.js already installed: $(node --version)"
fi

# Step 3: Skip PostgreSQL Installation (Using Neon Database)
print_status "Step 3: Using existing Neon serverless database - skipping PostgreSQL installation"
print_info "Database: ep-plain-silence-afjvbi6v.c-2.us-west-2.aws.neon.tech"

# Step 4: Install PM2
if ! command -v pm2 &> /dev/null; then
    print_status "Step 4: Installing PM2 process manager..."
    sudo npm install -g pm2
else
    print_status "Step 4: PM2 already installed"
fi

# Step 5: Install Nginx
if ! command -v nginx &> /dev/null; then
    print_status "Step 5: Installing Nginx web server..."
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    print_status "Step 5: Nginx already installed"
fi

# Step 6: Install OpenVPN Server
if ! command -v openvpn &> /dev/null; then
    print_status "Step 6: Installing OpenVPN server..."
    sudo apt install openvpn easy-rsa -y
    sudo systemctl enable openvpn@server
else
    print_status "Step 6: OpenVPN already installed"
fi

# Step 7: Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    print_status "Step 7: Installing Certbot for SSL certificates..."
    sudo apt install certbot python3-certbot-nginx -y
else
    print_status "Step 7: Certbot already installed"
fi

# Step 8: Project Setup
print_status "Step 8: Setting up project directory..."
if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p $PROJECT_DIR
fi
sudo chown -R $USER:$USER $PROJECT_DIR
cd $PROJECT_DIR

# Step 9: Install Dependencies
print_status "Step 9: Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    print_error "package.json not found. Please ensure the project files are uploaded to $PROJECT_DIR"
    exit 1
fi

# Step 10: Create Production Environment File
print_status "Step 10: Creating production environment configuration..."
cat > .env << EOL
# Production Environment Configuration for mkashop.online
NODE_ENV=production
PORT=3000

# Database Configuration (Using Neon Serverless)
DATABASE_URL=$NEON_DB_URL

# Domain Configuration
DOMAIN_MAIN=$DOMAIN_MAIN
DOMAIN_PROVIDER=$DOMAIN_PROVIDER
DOMAIN_API=$DOMAIN_API
SERVER_IP=$SERVER_IP

# M-Pesa Production Configuration (UPDATE WITH YOUR CREDENTIALS)
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_production_short_code
MPESA_PASSKEY=your_production_passkey
MPESA_CALLBACK_URL=https://$DOMAIN_API/api/payment/callback
MPESA_ENVIRONMENT=production

# OpenVPN Configuration
OVPN_SERVER_IP=$SERVER_IP
OVPN_PORT=1194
OVPN_PROTOCOL=udp

# Security Configuration
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Email Configuration (Optional - for notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email@$DOMAIN_MAIN
SMTP_PASS=your_email_password

# Backup Configuration
BACKUP_RETENTION_DAYS=30
EOL

print_warning "Environment file created. Please update M-Pesa credentials before starting the application!"

# Step 11: Database Migration
print_status "Step 11: Running database migrations..."
npm run db:push

# Step 12: Build Application
print_status "Step 12: Building application for production..."
npm run build

# Step 13: Create Logs Directory
print_status "Step 13: Setting up logging..."
mkdir -p logs
mkdir -p /var/log/hotspot

# Step 14: Setup Firewall
print_status "Step 14: Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 1194/udp  # OpenVPN
sudo ufw allow 8291/tcp  # MikroTik API
sudo ufw --force enable

# Step 15: Create Backup Script
print_status "Step 15: Setting up automated backups..."
cat > backup.sh << 'EOL'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/hotspot"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump hotspot_production > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz --exclude='node_modules' --exclude='logs' /var/www/hotspot

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOL
chmod +x backup.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/hotspot/backup.sh") | crontab -

print_status "🎉 Basic system setup completed!"
echo ""
echo "✅ System packages updated"
echo "✅ Node.js 20.x installed"
echo "✅ Using Neon serverless database (no local PostgreSQL needed)"
echo "✅ PM2 process manager installed"
echo "✅ Nginx web server installed"
echo "✅ OpenVPN server installed"
echo "✅ Certbot SSL manager installed"
echo "✅ Project dependencies installed"
echo "✅ Production environment configured"
echo "✅ Database schema deployed"
echo "✅ Application built for production"
echo "✅ Firewall configured"
echo "✅ Automated backups configured"
echo ""
print_warning "⚠️  IMPORTANT NEXT STEPS:"
echo "1. 📝 Update M-Pesa credentials in .env file"
echo "2. 🌐 Configure DNS records in cPanel (see dns-setup.md)"
echo "3. 🔒 Setup SSL certificates (run ssl-setup.sh)"
echo "4. 🔧 Configure Nginx (run nginx-setup.sh)"
echo "5. 🏃 Start the application (run app-start.sh)"
echo "6. 🔐 Setup OpenVPN server (see openvpn-setup.md)"
echo ""
print_info "📖 Refer to DEPLOYMENT_GUIDE.md for detailed instructions"