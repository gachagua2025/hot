# VPS Deployment Guide for MikroTik Hotspot Management System

## Prerequisites

Before deploying on your VPS, ensure you have:
- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name (optional but recommended)
- PostgreSQL database (can be local or cloud-based)

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js (20.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.3 Install PostgreSQL (if using local database)
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE hotspot_db;"
sudo -u postgres psql -c "CREATE USER hotspot_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hotspot_db TO hotspot_user;"
```

### 1.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 1.5 Install Nginx (Web Server)
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 2: Application Deployment

### 2.1 Upload and Extract Project
```bash
# Upload your project zip file to /var/www/
cd /var/www/
sudo unzip hotspot-system.zip
sudo mv hotspot-system hotspot
cd hotspot
sudo chown -R $USER:$USER /var/www/hotspot
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Environment Configuration
Create production environment file:
```bash
cp .env.example .env
nano .env
```

Configure the following variables:
```env
# Database Configuration
DATABASE_URL=postgresql://hotspot_user:your_secure_password@localhost:5432/hotspot_db

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_short_code
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=production

# Server Configuration
NODE_ENV=production
PORT=3000
```

## Step 3: Database Setup

### 3.1 Run Database Migration
```bash
npm run db:push
```

### 3.2 Create Admin User (Run this once)
```bash
node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  await pool.query(
    'INSERT INTO admins (id, username, password, name, email, role, created_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())',
    ['admin', hashedPassword, 'Admin User', 'admin@yourdomain.com', 'admin']
  );
  console.log('Admin user created successfully');
  process.exit(0);
}

createAdmin().catch(console.error);
"
```

## Step 4: Build Application

### 4.1 Build for Production
```bash
npm run build
```

## Step 5: PM2 Configuration

### 5.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Add the following configuration:
```javascript
module.exports = {
  apps: [{
    name: 'hotspot-system',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 5.2 Create Logs Directory
```bash
mkdir logs
```

### 5.3 Start Application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 6: Nginx Configuration

### 6.1 Create Nginx Site Configuration
```bash
sudo nano /etc/nginx/sites-available/hotspot
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (add your SSL certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

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
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Static files (if serving separately)
    location /static/ {
        alias /var/www/hotspot/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.2 Enable Site and Test Configuration
```bash
sudo ln -s /etc/nginx/sites-available/hotspot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: SSL Certificate (Recommended)

### 7.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 8: Firewall Configuration

### 8.1 Configure UFW Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Step 9: Monitoring and Maintenance

### 9.1 PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs hotspot-system

# Restart application
pm2 restart hotspot-system

# Monitor in real-time
pm2 monit
```

### 9.2 Database Backup Script
Create a backup script:
```bash
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump hotspot_db > /var/backups/hotspot_backup_$DATE.sql
# Keep only last 7 days of backups
find /var/backups -name "hotspot_backup_*.sql" -mtime +7 -delete
```

Make it executable and add to cron:
```bash
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /var/www/hotspot/backup.sh
```

## Step 10: Testing Deployment

### 10.1 Test Application
1. Visit your domain: `https://yourdomain.com`
2. Test captive portal functionality
3. Login to admin panel: `https://yourdomain.com/admin`
4. Test M-Pesa payment with a small amount

### 10.2 Test M-Pesa Callback
Ensure your callback URL is accessible:
```bash
curl -X POST https://yourdomain.com/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "callback"}'
```

## Troubleshooting

### Common Issues:

1. **Application won't start**
   ```bash
   pm2 logs hotspot-system
   ```

2. **Database connection issues**
   ```bash
   sudo -u postgres psql hotspot_db -c "SELECT 1;"
   ```

3. **M-Pesa callback not working**
   - Check firewall rules
   - Verify SSL certificate
   - Test callback URL accessibility

4. **Nginx errors**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

## Security Best Practices

1. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade -y
   npm audit && npm audit fix
   ```

2. **Log Monitoring**
   ```bash
   pm2 logs hotspot-system --lines 100
   sudo tail -f /var/log/nginx/access.log
   ```

3. **Database Security**
   - Use strong passwords
   - Limit database access
   - Regular backups

4. **Environment Variables**
   - Never commit secrets to git
   - Use strong API keys
   - Rotate credentials regularly

## Maintenance Commands

```bash
# Update application
pm2 stop hotspot-system
git pull origin main  # if using git
npm install
npm run build
pm2 restart hotspot-system

# View system resources
htop
df -h
free -h

# Check application health
curl -f https://yourdomain.com/api/plans
```

Your MikroTik hotspot management system is now deployed and ready for production use!