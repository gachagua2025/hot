#!/bin/bash

# VPS Deployment Script for MikroTik Hotspot Management System
# Run this script on your VPS server after uploading the project files

set -e  # Exit on any error

echo "🚀 Starting deployment of MikroTik Hotspot Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Please do not run this script as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    sudo apt install postgresql postgresql-contrib -y
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Create database and user
    print_status "Setting up database..."
    sudo -u postgres psql -c "CREATE DATABASE hotspot_db;" || print_warning "Database might already exist"
    sudo -u postgres psql -c "CREATE USER hotspot_user WITH PASSWORD 'hotspot_secure_password_2024';" || print_warning "User might already exist"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hotspot_db TO hotspot_user;" || print_warning "Privileges might already be granted"
else
    print_status "PostgreSQL already installed"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
else
    print_status "Nginx already installed"
fi

# Navigate to project directory
cd /var/www/hotspot || { print_error "Project directory not found. Please ensure the project is extracted to /var/www/hotspot"; exit 1; }

# Set proper ownership
sudo chown -R $USER:$USER /var/www/hotspot

# Install project dependencies
print_status "Installing project dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating environment file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://hotspot_user:hotspot_secure_password_2024@localhost:5432/hotspot_db

# M-Pesa Configuration (UPDATE THESE WITH YOUR ACTUAL CREDENTIALS)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_BUSINESS_SHORT_CODE=your_short_code_here
MPESA_PASSKEY=your_passkey_here
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=production

# Server Configuration
NODE_ENV=production
PORT=3000
EOL
    print_warning "Created .env file with default values. Please update M-Pesa credentials!"
else
    print_status "Environment file already exists"
fi

# Run database migration
print_status "Setting up database schema..."
npm run db:push

# Build application
print_status "Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Setup PM2 if not already running
if ! pm2 list | grep -q "hotspot-system"; then
    print_status "Starting application with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | tail -n 1 | sudo bash || print_warning "PM2 startup might need manual setup"
else
    print_status "Restarting existing PM2 process..."
    pm2 restart hotspot-system
fi

# Setup Nginx configuration
if [ ! -f /etc/nginx/sites-available/hotspot ]; then
    print_status "Setting up Nginx configuration..."
    sudo cp nginx.conf /etc/nginx/sites-available/hotspot
    sudo ln -sf /etc/nginx/sites-available/hotspot /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
else
    print_status "Nginx configuration already exists"
fi

# Setup firewall
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create backup script
print_status "Setting up backup script..."
cat > backup.sh << 'EOL'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /var/backups
pg_dump hotspot_db > /var/backups/hotspot_backup_$DATE.sql
# Keep only last 7 days of backups
find /var/backups -name "hotspot_backup_*.sql" -mtime +7 -delete
echo "Backup completed: hotspot_backup_$DATE.sql"
EOL
chmod +x backup.sh

# Add backup to cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/hotspot/backup.sh") | crontab -

print_status "Deployment completed successfully!"
echo ""
echo "🎉 Your MikroTik Hotspot Management System is now deployed!"
echo ""
echo "Next steps:"
echo "1. Update your domain DNS to point to this server"
echo "2. Update .env file with your actual M-Pesa credentials"
echo "3. Setup SSL certificate:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com"
echo "4. Test the application at your domain"
echo ""
echo "Admin login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Useful commands:"
echo "- Check app status: pm2 status"
echo "- View logs: pm2 logs hotspot-system"
echo "- Restart app: pm2 restart hotspot-system"
echo "- Run backup: ./backup.sh"
echo ""
print_warning "Remember to update the M-Pesa credentials in .env file!"