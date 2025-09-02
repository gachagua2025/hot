#!/bin/bash

# Application Startup Script for mkashop.online Infrastructure
# This script starts the hotspot management application in production

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

PROJECT_DIR="/var/www/hotspot"
LOG_DIR="/var/log/hotspot"

echo "🚀 Starting mkashop.online Hotspot Management System..."

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    print_error "Project not found at $PROJECT_DIR"
    print_info "Please ensure the project is deployed to $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Environment Check
print_status "Step 1: Checking environment configuration..."

if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Please copy production.env.template to .env and configure it"
    exit 1
fi

# Check if M-Pesa credentials are configured
if grep -q "your_production_consumer_key_here" .env; then
    print_warning "M-Pesa credentials not configured in .env file"
    print_warning "Please update M-Pesa settings before starting"
fi

# Step 2: Database Connection Check
print_status "Step 2: Checking Neon database connection..."

if npm run db:push > /dev/null 2>&1; then
    print_status "Neon database connection successful"
else
    print_error "Neon database connection failed"
    print_info "Please check your Neon DATABASE_URL in .env file"
    exit 1
fi

# Step 3: Create necessary directories
print_status "Step 3: Creating log directories..."
sudo mkdir -p $LOG_DIR
sudo mkdir -p logs
sudo chown -R $USER:$USER logs
sudo chown -R $USER:$USER $LOG_DIR 2>/dev/null || true

# Step 4: Build application
print_status "Step 4: Building application..."
npm run build

# Step 5: Create admin user if not exists
print_status "Step 5: Ensuring admin user exists..."

node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function ensureAdminUser() {
  try {
    const existingAdmin = await pool.query('SELECT id FROM admins WHERE username = \$1', ['admin']);
    
    if (existingAdmin.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 12);
      await pool.query(
        'INSERT INTO admins (id, username, password, name, email, role, created_at) VALUES (gen_random_uuid(), \$1, \$2, \$3, \$4, \$5, NOW())',
        ['admin', hashedPassword, 'System Administrator', 'admin@mkashop.online', 'admin']
      );
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

ensureAdminUser();
"

# Step 6: Start application with PM2
print_status "Step 6: Starting application with PM2..."

# Copy production ecosystem config
cp DEP/production-ecosystem.config.js ecosystem.config.js

# Stop existing process if running
if pm2 list | grep -q "mkashop-hotspot"; then
    print_info "Stopping existing application..."
    pm2 stop mkashop-hotspot
    pm2 delete mkashop-hotspot
fi

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u $USER --hp $HOME | tail -n 1 | sudo bash || print_warning "PM2 startup script setup might need manual configuration"

# Step 7: Verify application startup
print_status "Step 7: Verifying application startup..."

sleep 10  # Wait for application to start

# Check if application is running
if pm2 list | grep -q "online.*mkashop-hotspot"; then
    print_status "Application is running successfully"
else
    print_error "Application failed to start"
    print_info "Checking PM2 logs..."
    pm2 logs mkashop-hotspot --lines 20
    exit 1
fi

# Step 8: Test application endpoints
print_status "Step 8: Testing application endpoints..."

sleep 5  # Additional wait for full startup

# Test local API endpoint
if curl -s -f http://localhost:3000/api/plans > /dev/null; then
    print_status "Local API is responding"
else
    print_warning "Local API test failed - this might be normal during initial startup"
fi

# Step 9: Display system status
print_status "Step 9: System status summary..."

echo ""
echo "🎉 mkashop.online Hotspot Management System is now running!"
echo ""
echo "📊 System Status:"
echo "================"

# PM2 status
echo "📋 Application Status:"
pm2 list

echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "🔒 Super Admin: https://mkashop.online/superadmin"
echo "🏢 Provider Portal: https://mkash.mkashop.online"
echo "🏢 Provider Admin: https://mkash.mkashop.online/admin"
echo "🔌 API Endpoint: https://api.mkashop.online/api"

echo ""
echo "👤 Default Login Credentials:"
echo "============================"
echo "Username: admin"
echo "Password: admin123"
echo "⚠️  Change password after first login!"

echo ""
echo "📁 Important Paths:"
echo "=================="
echo "📄 Application: $PROJECT_DIR"
echo "📋 Logs: $LOG_DIR"
echo "📋 PM2 Logs: ~/.pm2/logs/"
echo "🔧 Config: $PROJECT_DIR/.env"

echo ""
echo "🔧 Useful Commands:"
echo "=================="
echo "📊 View status: pm2 status"
echo "📋 View logs: pm2 logs mkashop-hotspot"
echo "🔄 Restart app: pm2 restart mkashop-hotspot"
echo "🛑 Stop app: pm2 stop mkashop-hotspot"
echo "📊 Monitor: pm2 monit"

echo ""
echo "🔍 Health Checks:"
echo "================"

# Check disk space
echo "💾 Disk Space:"
df -h / | tail -n +2

# Check memory
echo "🧠 Memory Usage:"
free -h

# Check application logs for errors
echo "📋 Recent Application Logs:"
pm2 logs mkashop-hotspot --lines 5 --raw | head -20

echo ""
print_status "🎉 Deployment completed successfully!"
print_info "Monitor the application logs and ensure all systems are functioning properly"

# Step 10: Setup monitoring script
print_status "Step 10: Setting up monitoring..."

cat > /usr/local/bin/hotspot-health-check.sh << 'EOF'
#!/bin/bash

# Health check script for hotspot application
LOG_FILE="/var/log/hotspot/health-check.log"
APP_URL="http://localhost:3000/api/plans"

# Function to log with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check if application is responding
if curl -s -f $APP_URL > /dev/null; then
    log_message "✅ Application is healthy"
    exit 0
else
    log_message "❌ Application health check failed"
    
    # Try to restart application
    pm2 restart mkashop-hotspot
    log_message "🔄 Application restart attempted"
    
    # Send alert (configure webhook or email as needed)
    # curl -X POST "YOUR_WEBHOOK_URL" -d "Application health check failed on $(hostname)"
    
    exit 1
fi
EOF

sudo chmod +x /usr/local/bin/hotspot-health-check.sh

# Add health check to cron (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/hotspot-health-check.sh") | crontab -

print_status "✅ Health monitoring configured"

echo ""
echo "🎯 Next Steps:"
echo "============="
echo "1. 🔒 Change default admin password"
echo "2. 🧪 Test M-Pesa payments with small amounts"  
echo "3. 🔧 Configure MikroTik routers with OpenVPN"
echo "4. 📊 Monitor application logs and performance"
echo "5. 🔐 Setup regular backups verification"

print_info "Your hotspot management system is now live and ready for production use!"