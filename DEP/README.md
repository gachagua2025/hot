# Production Deployment Package for mkashop.online

## 📦 Package Overview

This deployment package contains everything needed to deploy your MikroTik Hotspot Management System to production on your AWS Ubuntu 24 VM.

### 🏗️ Infrastructure Target
- **Server**: AWS Ubuntu 24 VM (IP: 13.60.237.52)
- **Main Domain**: mkashop.online (Super Admin Panel)
- **Provider Domain**: mkash.mkashop.online (Customer Portal)
- **API Domain**: api.mkashop.online (API Endpoints)
- **OpenVPN**: For secure MikroTik communication

---

## 📁 Files in This Package

### 🚀 Deployment Scripts
| File | Purpose | When to Use |
|------|---------|-------------|
| `production-deploy.sh` | Main deployment script | First - Sets up entire system |
| `nginx-setup.sh` | Multi-domain web server config | After DNS is configured |
| `ssl-setup.sh` | SSL certificates for all domains | After Nginx is configured |
| `app-start.sh` | Application startup script | Final step - Starts the app |

### 📋 Configuration Files
| File | Purpose | Description |
|------|---------|-------------|
| `production.env.template` | Environment variables template | Copy to `.env` and customize |
| `production-ecosystem.config.js` | PM2 process manager config | Production-ready PM2 settings |

### 📖 Documentation
| File | Purpose | Description |
|------|---------|-------------|
| `DEPLOYMENT_GUIDE.md` | Complete step-by-step guide | Start here for full instructions |
| `dns-setup.md` | DNS configuration for cPanel | Configure your domain records |
| `openvpn-setup.md` | OpenVPN server setup | For MikroTik router connectivity |

---

## 🚀 Quick Start (5 Steps)

### 1. Upload Project Files
```bash
# Upload your project to AWS server
scp -r ./hotspot-project ubuntu@13.60.237.52:/var/www/hotspot/
```

### 2. Configure DNS
Follow `dns-setup.md` to configure your cPanel DNS records.

### 3. Run Main Deployment
```bash
cd /var/www/hotspot
chmod +x DEP/production-deploy.sh
./DEP/production-deploy.sh
```

### 4. Configure Web Server & SSL
```bash
./DEP/nginx-setup.sh
./DEP/ssl-setup.sh
```

### 5. Start Application
```bash
cp DEP/production.env.template .env
nano .env  # Update M-Pesa credentials
./DEP/app-start.sh
```

---

## 🎯 Deployment Order (IMPORTANT)

Execute these scripts in the **exact order** shown:

1. **First**: Configure DNS records (see `dns-setup.md`)
2. **Second**: `./DEP/production-deploy.sh`
3. **Third**: `./DEP/nginx-setup.sh`
4. **Fourth**: `./DEP/ssl-setup.sh`
5. **Fifth**: Configure `.env` file
6. **Sixth**: `./DEP/app-start.sh`

**❌ Do NOT change this order** - each step depends on the previous one.

---

## ⚙️ What Each Script Does

### production-deploy.sh
- ✅ Updates Ubuntu 24 system
- ✅ Installs Node.js, PostgreSQL, PM2, Nginx
- ✅ Creates production database
- ✅ Installs project dependencies
- ✅ Configures firewall (UFW)
- ✅ Sets up automated backups

### nginx-setup.sh
- ✅ Configures multi-domain routing
- ✅ Sets up mkashop.online for Super Admin
- ✅ Sets up mkash.mkashop.online for Providers
- ✅ Sets up api.mkashop.online for API calls
- ✅ Configures rate limiting and security

### ssl-setup.sh
- ✅ Installs Let's Encrypt SSL certificates
- ✅ Configures automatic renewal
- ✅ Enables HTTPS for all domains
- ✅ Sets up security headers

### app-start.sh
- ✅ Builds application for production
- ✅ Creates admin user (admin/admin123)
- ✅ Starts with PM2 process manager
- ✅ Configures health monitoring
- ✅ Displays system status

---

## 🔧 Required Information

Before starting, ensure you have:

### Domain & Server
- [x] AWS Ubuntu 24 VM access (13.60.237.52)
- [x] cPanel access for mkashop.online
- [x] SSH access to server

### M-Pesa Credentials (CRITICAL)
- [ ] Production Consumer Key
- [ ] Production Consumer Secret  
- [ ] Production Business Short Code
- [ ] Production Passkey

### Optional (Recommended)
- [ ] Email SMTP credentials
- [ ] OpenVPN requirements (for MikroTik routers)

---

## 🎯 After Deployment

### Access URLs
- **Super Admin**: https://mkashop.online/superadmin
- **Provider Portal**: https://mkash.mkashop.online
- **Provider Admin**: https://mkash.mkashop.online/admin
- **API**: https://api.mkashop.online/api

### Default Login
- **Username**: admin
- **Password**: admin123
- **⚠️ Change password immediately after first login**

### System Management
```bash
# Check application status
pm2 status

# View logs
pm2 logs mkashop-hotspot

# Restart application
pm2 restart mkashop-hotspot

# Monitor system
pm2 monit
```

---

## 🆘 Troubleshooting

### Common Issues

#### DNS Not Propagating
- Wait 5-60 minutes for DNS propagation
- Use `dig mkashop.online +short` to check

#### SSL Certificate Failed
- Ensure DNS is propagated first
- Check domain accessibility: `curl -I http://mkashop.online`

#### Application Won't Start
- Check logs: `pm2 logs mkashop-hotspot`
- Verify `.env` configuration
- Check database connection

#### M-Pesa Callbacks Not Working
- Verify SSL is working on api.mkashop.online
- Test: `curl -X POST https://api.mkashop.online/api/payment/callback`

### Get Help
1. 📋 Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. 📝 Review application logs
3. 🔍 Check specific guide for your issue
4. 🛠️ Verify configuration files

---

## 📊 System Architecture

```
Internet
    │
    ├── mkashop.online (Super Admin)
    ├── mkash.mkashop.online (Provider Portal)
    └── api.mkashop.online (API)
    │
[Nginx Reverse Proxy]
    │
[Node.js Application on Port 3000]
    │
[PostgreSQL Database]
    │
[OpenVPN Server] ← MikroTik Routers
```

---

## 🔒 Security Features

- ✅ Let's Encrypt SSL certificates
- ✅ UFW firewall configured
- ✅ Rate limiting enabled
- ✅ Security headers configured
- ✅ Database access restricted
- ✅ OpenVPN encryption (optional)

---

## 📈 Monitoring & Maintenance

### Automated
- ✅ Daily database backups
- ✅ SSL certificate auto-renewal
- ✅ Application health checks
- ✅ Log rotation

### Manual (Recommended)
- 📊 Weekly performance monitoring
- 🔍 Monthly security audits
- 💾 Backup verification
- 📱 M-Pesa transaction monitoring

---

## 🎉 Success Indicators

Your deployment is successful when:
- ✅ All domains resolve to your server IP
- ✅ SSL certificates are installed and valid
- ✅ Application responds at all URLs
- ✅ Admin login works
- ✅ PM2 shows application as "online"
- ✅ Database connections work
- ✅ M-Pesa test transactions process

---

**📞 Support**: Keep this documentation handy for troubleshooting and maintenance.

**🔄 Updates**: Re-run deployment scripts to apply updates when needed.

**🎯 Production Ready**: This package is designed for production use with real customer traffic.