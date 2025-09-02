# DNS Configuration Guide for mkashop.online

## Overview
This guide walks you through setting up DNS records in your cPanel for the multi-domain hotspot management system.

## Required DNS Records

### 1. Main Domain (mkashop.online) - Super Admin
```
Type: A
Name: @
Value: 13.60.237.52
TTL: 300 (5 minutes)
```

```
Type: A
Name: www
Value: 13.60.237.52
TTL: 300 (5 minutes)
```

### 2. Provider Subdomain (mkash.mkashop.online) - Customer Portal
```
Type: A
Name: mkash
Value: 13.60.237.52
TTL: 300 (5 minutes)
```

### 3. API Subdomain (api.mkashop.online) - API Endpoints
```
Type: A
Name: api
Value: 13.60.237.52
TTL: 300 (5 minutes)
```

## Step-by-Step cPanel Configuration

### Step 1: Access cPanel DNS Zone Editor
1. Log in to your cPanel account for mkashop.online
2. Navigate to **Domains** section
3. Click on **Zone Editor**
4. Select your domain **mkashop.online**

### Step 2: Add/Update A Records

#### For Main Domain:
1. Click **+ A Record**
2. Name: `@` (represents the root domain)
3. Address: `13.60.237.52`
4. TTL: `300`
5. Click **Add Record**

#### For WWW Subdomain:
1. Click **+ A Record**
2. Name: `www`
3. Address: `13.60.237.52`
4. TTL: `300`
5. Click **Add Record**

#### For Provider Subdomain:
1. Click **+ A Record**
2. Name: `mkash`
3. Address: `13.60.237.52`
4. TTL: `300`
5. Click **Add Record**

#### For API Subdomain:
1. Click **+ A Record**
2. Name: `api`
3. Address: `13.60.237.52`
4. TTL: `300`
5. Click **Add Record**

### Step 3: Verify DNS Records
After adding the records, verify they are correct:

```bash
# Check main domain
dig mkashop.online +short

# Check www subdomain
dig www.mkashop.online +short

# Check provider subdomain
dig mkash.mkashop.online +short

# Check API subdomain
dig api.mkashop.online +short
```

All commands should return: `13.60.237.52`

## DNS Propagation

### Checking Propagation Status
Use online tools to check DNS propagation:
- https://www.whatsmydns.net/
- https://dnschecker.org/

Enter each domain to verify global propagation:
- `mkashop.online`
- `www.mkashop.online`
- `mkash.mkashop.online`
- `api.mkashop.online`

### Propagation Timeline
- **Local ISP**: 5-15 minutes
- **Regional**: 30-60 minutes
- **Global**: 2-24 hours (typically 2-4 hours)

## Alternative: Using Cloudflare (Recommended)

If you want better performance and security, consider using Cloudflare:

### Step 1: Add Domain to Cloudflare
1. Sign up at https://cloudflare.com/
2. Add your domain `mkashop.online`
3. Cloudflare will scan existing DNS records

### Step 2: Update Nameservers
Update your domain's nameservers in your domain registrar to:
```
ns1.cloudflare.com
ns2.cloudflare.com
```

### Step 3: Configure DNS in Cloudflare
Add the same A records in Cloudflare dashboard:
- `mkashop.online` → `13.60.237.52` (Orange cloud enabled)
- `www.mkashop.online` → `13.60.237.52` (Orange cloud enabled)
- `mkash.mkashop.online` → `13.60.237.52` (Orange cloud enabled)
- `api.mkashop.online` → `13.60.237.52` (Orange cloud enabled)

### Benefits of Cloudflare:
- Free SSL certificates
- DDoS protection
- CDN acceleration
- Better DNS management
- Analytics

## Testing DNS Configuration

### Test Commands
```bash
# Test from your server
nslookup mkashop.online
nslookup mkash.mkashop.online
nslookup api.mkashop.online

# Test HTTP access (before SSL)
curl -I http://mkashop.online
curl -I http://mkash.mkashop.online
curl -I http://api.mkashop.online
```

### Expected Results
- All domains should resolve to `13.60.237.52`
- HTTP requests should either respond or redirect to HTTPS
- No "connection refused" errors

## Troubleshooting

### Common Issues:

#### 1. DNS Not Propagating
```bash
# Clear local DNS cache
sudo systemctl restart systemd-resolved

# Use alternative DNS servers
dig @8.8.8.8 mkashop.online
dig @1.1.1.1 mkashop.online
```

#### 2. Wrong IP Address
- Double-check the A record values in cPanel
- Ensure TTL is set to 300 (5 minutes) for faster updates
- Wait for propagation before testing

#### 3. Subdomain Not Working
- Verify subdomain A records are created separately
- Check for typos in subdomain names
- Ensure your hosting provider supports unlimited subdomains

#### 4. cPanel Issues
- Contact your hosting provider if you can't access Zone Editor
- Some providers require DNS records to be added through their support

## Next Steps

After DNS is configured and propagated:

1. ✅ Verify all domains resolve to your server IP
2. 🔒 Run `ssl-setup.sh` to install SSL certificates
3. 🌐 Run `nginx-setup.sh` to configure web server
4. 🚀 Start the application with `app-start.sh`

## Security Notes

- Keep TTL low (300 seconds) during initial setup
- Increase TTL to 3600 (1 hour) after everything is working
- Never expose your actual server IP if using Cloudflare proxy
- Monitor DNS changes for unauthorized modifications