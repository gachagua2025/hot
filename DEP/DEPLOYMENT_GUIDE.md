# Complete Production Deployment Guide

## mkashop.online Hotspot Management System

### Infrastructure Overview
- **Server**: AWS Ubuntu 24 VM (13.60.237.52)
- **Main Domain**: mkashop.online (Super Admin)
- **Provider Domain**: mkash.mkashop.online (Customer Portal)
- **API Domain**: api.mkashop.online (API Endpoints)
- **VPN**: OpenVPN for MikroTik communication

---

## Quick Start Checklist

### Pre-Deployment Requirements
- [ ] AWS Ubuntu 24 VM with public IP 13.60.237.52
- [ ] SSH access to the server
- [ ] Domain mkashop.online with cPanel access
- [ ] M-Pesa production API credentials
- [ ] Project files uploaded to `/var/www/hotspot`

### Deployment Steps (Execute in Order)
- [ ] 1. Upload project files to server
- [ ] 2. Configure DNS records in cPanel
- [ ] 3. Run main deployment script
- [ ] 4. Configure multi-domain Nginx
- [ ] 5. Install SSL certificates
- [ ] 6. Setup OpenVPN server (optional)
- [ ] 7. Configure environment variables
- [ ] 8. Start the application
- [ ] 9. Test all functionality

---

## Step-by-Step Deployment Instructions

### Step 1: Server Preparation

#### 1.1 Connect to Your Server
```bash
ssh ubuntu@13.60.237.52
```

#### 1.2 Upload Project Files
Option A: Using SCP
```bash
# From your local machine
scp -r ./hotspot-project ubuntu@13.60.237.52:/tmp/
ssh ubuntu@13.60.237.52
sudo mkdir -p /var/www/hotspot
sudo mv /tmp/hotspot-project/* /var/www/hotspot/
sudo chown -R ubuntu:ubuntu /var/www/hotspot
```

Option B: Using Git (Recommended)
```bash
sudo mkdir -p /var/www/hotspot
cd /var/www/hotspot
git clone https://github.com/yourusername/hotspot-system.git .
sudo chown -R ubuntu:ubuntu /var/www/hotspot
```

### Step 2: DNS Configuration

#### 2.1 Configure DNS in cPanel
Follow the detailed guide in `dns-setup.md`:
- Add A records for mkashop.online → 13.60.237.52
- Add A records for mkash.mkashop.online → 13.60.237.52  
- Add A records for api.mkashop.online → 13.60.237.52

#### 2.2 Verify DNS Propagation
```bash
# Wait for DNS propagation (5-60 minutes)
dig mkashop.online +short
dig mkash.mkashop.online +short
dig api.mkashop.online +short
# All should return: 13.60.237.52
```

### Step 3: Main System Deployment

#### 3.1 Run Primary Deployment Script
```bash
cd /var/www/hotspot
chmod +x DEP/production-deploy.sh
./DEP/production-deploy.sh
```

This script will:
- Update Ubuntu system
- Install Node.js, PostgreSQL, PM2, Nginx, OpenVPN
- Create production database
- Install project dependencies
- Configure firewall
- Setup automated backups

### Step 4: Configure Multi-Domain Nginx

#### 4.1 Setup Nginx Configuration
```bash
cd /var/www/hotspot
chmod +x DEP/nginx-setup.sh
./DEP/nginx-setup.sh
```

This configures:
- mkashop.online for Super Admin access
- mkash.mkashop.online for Provider Portal
- api.mkashop.online for API endpoints

### Step 5: Install SSL Certificates

#### 5.1 Install SSL for All Domains
```bash
cd /var/www/hotspot
chmod +x DEP/ssl-setup.sh
./DEP/ssl-setup.sh
```

This will:
- Install Let's Encrypt certificates
- Configure automatic renewal
- Enable HTTPS for all domains

### Step 6: Environment Configuration

#### 6.1 Configure Production Environment
```bash
cd /var/www/hotspot
cp DEP/production.env.template .env
nano .env
```

#### 6.2 Essential Environment Variables to Update
```env
# M-Pesa Production Credentials (REQUIRED)
MPESA_CONSUMER_KEY=your_actual_consumer_key
MPESA_CONSUMER_SECRET=your_actual_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_actual_short_code
MPESA_PASSKEY=your_actual_passkey

# Email Configuration (Optional)
SMTP_USER=admin@mkashop.online
SMTP_PASS=your_email_password

# Generate secure secrets
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
```

### Step 7: Start the Application

#### 7.1 Start All Services
```bash
cd /var/www/hotspot
chmod +x DEP/app-start.sh
./DEP/app-start.sh
```

This will:
- Build the application
- Create admin user
- Start with PM2
- Configure monitoring
- Display system status

### Step 8: OpenVPN Setup (Optional but Recommended)

#### 8.1 Configure OpenVPN Server
```bash
# Follow the comprehensive guide
cat DEP/openvpn-setup.md
```

This enables secure communication with remote MikroTik routers.

### Step 9: Final Verification

#### 9.1 Test All Domains
```bash
# Test HTTPS access
curl -I https://mkashop.online
curl -I https://mkash.mkashop.online  
curl -I https://api.mkashop.online/api/plans
```

#### 9.2 Test Application Login
1. Visit https://mkashop.online/superadmin
2. Login with: admin / admin123
3. Change password immediately

#### 9.3 Test Provider Portal
1. Visit https://mkash.mkashop.online
2. Test captive portal functionality
3. Test admin login at https://mkash.mkashop.online/admin

---

## Post-Deployment Configuration

### Admin User Setup
1. Login to Super Admin at https://mkashop.online/superadmin
2. Change default password
3. Create additional admin users as needed
4. Configure system settings

### Provider Configuration
1. Create provider accounts
2. Assign subdomains
3. Configure payment gateways
4. Setup MikroTik routers

### M-Pesa Testing
1. Test with small amounts (KSh 1)
2. Verify callback processing
3. Check transaction logs
4. Confirm user activation

---

## Monitoring and Maintenance

### Daily Monitoring
```bash
# Check application status
pm2 status

# View application logs
pm2 logs mkashop-hotspot

# Check system resources
htop
df -h
```

### Log Locations
- **Application Logs**: `/var/log/hotspot/`
- **PM2 Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **PostgreSQL Logs**: `/var/log/postgresql/`

### Backup Verification
```bash
# Manual backup test
./backup.sh

# Check backup files
ls -la /var/backups/hotspot/
```

### Performance Monitoring
- Monitor response times
- Check database performance
- Monitor disk space usage
- Track memory consumption

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check PM2 logs
pm2 logs mkashop-hotspot

# Check environment configuration
cat .env | grep -v "SECRET\|PASSWORD"

# Restart application
pm2 restart mkashop-hotspot
```

#### 2. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Check nginx configuration
sudo nginx -t
```

#### 3. Database Connection Issues
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database status
sudo systemctl status postgresql

# Check connection string
echo $DATABASE_URL
```

#### 4. M-Pesa Callback Issues
```bash
# Test callback endpoint
curl -X POST https://api.mkashop.online/api/payment/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "callback"}'

# Check API logs
pm2 logs mkashop-hotspot | grep -i mpesa
```

#### 5. Domain Resolution Issues
```bash
# Check DNS resolution
nslookup mkashop.online
nslookup mkash.mkashop.online
nslookup api.mkashop.online

# Check nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

### Getting Help
1. Check application logs first
2. Review this deployment guide
3. Verify environment configuration
4. Test individual components
5. Contact system administrator if needed

---

## Security Checklist

### Server Security
- [ ] UFW firewall enabled and configured
- [ ] SSH key-based authentication
- [ ] Regular security updates
- [ ] Strong passwords for all accounts
- [ ] Limited sudo access

### Application Security
- [ ] SSL certificates installed and auto-renewing
- [ ] Environment variables properly secured
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] Security headers configured

### Monitoring Security
- [ ] Log monitoring configured
- [ ] Failed login attempt monitoring
- [ ] Unusual activity alerts
- [ ] Regular security audits
- [ ] Backup integrity checks

---

## Performance Optimization

### Server Optimization
- Use SSD storage for better performance
- Configure swap space appropriately
- Optimize PostgreSQL settings
- Enable Nginx caching
- Configure PM2 cluster mode

### Application Optimization
- Enable compression
- Optimize database queries
- Implement caching strategies
- Monitor memory usage
- Profile slow endpoints

### Network Optimization
- Use CDN for static assets
- Enable gzip compression
- Optimize image sizes
- Implement lazy loading
- Monitor bandwidth usage

---

## Backup and Recovery

### Automated Backups
- Database backups daily at 2 AM
- Application files backed up daily
- 30-day retention policy
- Offsite backup recommended

### Recovery Procedures
1. Stop application services
2. Restore database from backup
3. Restore application files
4. Update configuration if needed
5. Restart services
6. Verify functionality

### Disaster Recovery
- Document recovery procedures
- Test backups regularly
- Maintain offsite copies
- Plan for minimal downtime
- Train staff on procedures

---

## Scaling Considerations

### Horizontal Scaling
- Multiple server instances
- Load balancer configuration
- Shared database setup
- Session management
- File synchronization

### Vertical Scaling
- Increase server resources
- Optimize database settings
- Add more PM2 instances
- Increase connection pools
- Monitor resource usage

---

Your mkashop.online Hotspot Management System is now ready for production use! 🎉