# VPS Deployment Script for MikroTik Hotspot Management

## Your VPS Server: 209.74.86.231

### Step 1: Complete VPS Application Setup

Your application is now ready with auto-discovery features. Here's how to set it up for production:

#### A. Environment Configuration
Create `.env` file on your VPS with:
```bash
# Database
DATABASE_URL="your_postgresql_connection_string"

# M-Pesa Configuration (Required for payments)
MPESA_CONSUMER_KEY="your_mpesa_consumer_key"
MPESA_CONSUMER_SECRET="your_mpesa_consumer_secret"
MPESA_BUSINESS_SHORT_CODE="your_business_short_code"
MPESA_PASSKEY="your_mpesa_passkey"
MPESA_CALLBACK_URL="http://209.74.86.231:5000/api/mpesa/callback"
MPESA_ENVIRONMENT="sandbox"  # or "production"

# Application
NODE_ENV="production"
PORT="5000"

# Optional: Specific MikroTik hosts for discovery
MIKROTIK_DISCOVERY_HOSTS="192.168.1.1,10.0.0.1"
```

#### B. Start Application
```bash
cd /path/to/your/application
npm install
npm run build
npm start
```

Your application will be accessible at: **http://209.74.86.231:5000**

### Step 2: MikroTik Router Setup for Auto-Discovery

#### Quick Setup Script for Your Router
Run this on your MikroTik router terminal:

```bash
# 1. Set router identity for discovery
/system identity set name="MyHotspot-Router-01"

# 2. Enable API with secure credentials
/ip service set api disabled=no port=8728
/user add name=hotspot-api password=VPS2025Secure! group=full comment="Auto-discovery API user"

# 3. Create hotspot profiles for different speeds
/ip hotspot user profile add name="profile_1M" rate-limit="1M/1M" session-timeout=00:00:00 shared-users=1
/ip hotspot user profile add name="profile_5M" rate-limit="5M/5M" session-timeout=00:00:00 shared-users=1
/ip hotspot user profile add name="profile_10M" rate-limit="10M/10M" session-timeout=00:00:00 shared-users=1
/ip hotspot user profile add name="profile_20M" rate-limit="20M/20M" session-timeout=00:00:00 shared-users=1

# 4. Configure walled garden for M-Pesa and your VPS
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke comment="M-Pesa Access"
/ip hotspot walled-garden add dst-host=*.mpesa.co.ke comment="M-Pesa Access"
/ip hotspot walled-garden add dst-host=209.74.86.231 comment="VPS Application Access"

# 5. Allow API access from your VPS
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=209.74.86.231 action=accept comment="VPS API Access"

# 6. Set discovery identifier in system note
/system note set note="HOTSPOT-AUTO-DISCOVERY|hotspot-api|VPS2025Secure!"

# 7. Enable logging for troubleshooting
/system logging add topics=hotspot,info action=memory
/system logging add topics=api,info action=memory
```

### Step 3: Auto-Discovery Integration Process

#### Method 1: Automatic Discovery (Recommended)
1. **Access Admin Panel**: Go to http://209.74.86.231:5000/admin
2. **Login** with your admin credentials
3. **Navigate to Routers**: Click "Routers" in the sidebar
4. **Click "Auto-Discover"**: The ⚡ Auto-Discover button will scan for MikroTik routers
5. **Wait for Results**: The system will automatically find and add your router

#### Method 2: Manual Addition (If auto-discovery doesn't work)
1. **Click "Add Router"** in the admin panel
2. **Fill in details**:
   - **Name**: MyHotspot-Router-01
   - **Host**: [Your router's IP address]
   - **Port**: 8728
   - **Username**: hotspot-api
   - **Password**: VPS2025Secure!
   - **Active**: ✓ (checked)
3. **Test Connection**: Click the test button (🧪)
4. **Verify Status**: Should show "Connection Successful"

### Step 4: Network Configuration Examples

#### Scenario A: Router with Public IP
```
[Internet] ---- [MikroTik Router: PUBLIC_IP] ---- [WiFi Clients]
                       |
                   API Port 8728
                       |
[VPS: 209.74.86.231] ---- [Hotspot Management App]
```

**Router Configuration:**
- Host: Your router's public IP
- Port: 8728
- Direct connection from VPS

#### Scenario B: Router Behind ISP Router (Most Common)
```
[Internet] ---- [ISP Router: PUBLIC_IP] ---- [MikroTik: 192.168.1.100] ---- [WiFi Clients]
                       |                              |
                Port Forward 8728                  API Port 8728
                       |                              |
[VPS: 209.74.86.231] ----------------------------- [Hotspot Management App]
```

**ISP Router Setup:**
- Forward external port 8728 to 192.168.1.100:8728
- **Application Configuration:**
  - Host: ISP router's public IP
  - Port: 8728

**MikroTik Router Setup:**
- Local IP: 192.168.1.100
- Allow API access from any (since it's behind NAT)

### Step 5: Testing the Complete System

#### A. Test Auto-Discovery
1. Access admin panel at http://209.74.86.231:5000/admin
2. Go to Routers section
3. Click "Auto-Discover" button
4. Check for success message and router appearance

#### B. Test Router Connection
1. Find your router in the list
2. Click the test button (🧪)
3. Should show "Connection Successful"
4. Router status should be "Online"

#### C. Test Payment Flow
1. **Connect device** to your router's hotspot WiFi
2. **Open browser** - should redirect to captive portal at http://209.74.86.231:5000
3. **Select a plan** and initiate payment
4. **Complete M-Pesa payment** on your phone
5. **Check router** for created user:
   ```bash
   /ip hotspot user print
   ```
6. **Test internet access** with generated credentials

### Step 6: Production Security

#### A. Secure Your Router
```bash
# Change default admin password
/user set admin password=SecureRouterAdmin123!

# Disable unused services
/ip service disable telnet
/ip service disable ftp
/ip service disable www

# Limit API access to VPS only
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=drop comment="Block other API access"
```

#### B. Secure Your VPS
```bash
# Configure firewall (if using ufw)
sudo ufw allow 5000/tcp
sudo ufw allow ssh
sudo ufw enable

# Use process manager (PM2)
npm install -g pm2
pm2 start npm --name "hotspot-app" -- start
pm2 startup
pm2 save
```

### Step 7: Monitoring and Maintenance

#### A. Check Application Status
```bash
# Application logs
pm2 logs hotspot-app

# Application status
pm2 status
```

#### B. Check Router Status
```bash
# View router logs
/log print where topics~"hotspot"

# Check active users
/ip hotspot active print

# Monitor system resources
/system resource print
```

### Step 8: Troubleshooting Common Issues

#### Router Not Discovered
1. **Check network connectivity**: Can VPS ping router IP?
2. **Verify API service**: `/ip service print` - API should be enabled
3. **Check firewall**: Ensure port 8728 is accessible
4. **Test credentials**: Try connecting manually with WinBox

#### Payment Issues
1. **Verify M-Pesa credentials** in .env file
2. **Check callback URL**: Must be http://209.74.86.231:5000/api/mpesa/callback
3. **Test walled garden**: Users should access M-Pesa domains
4. **Monitor application logs**: Check for M-Pesa API errors

#### User Creation Failed
1. **Check router API connection**: Test from admin panel
2. **Verify user profiles exist**: `/ip hotspot user profile print`
3. **Check router logs**: `/log print where topics~"api"`
4. **Test manual user creation**: Create test user on router

### Step 9: Scaling for Multiple Routers

#### Auto-Discovery for Multiple Locations
1. **Configure each router** with the same API credentials
2. **Use Auto-Discover** to find all routers automatically
3. **Assign different names** to identify locations
4. **Monitor all routers** from single admin panel

#### Load Balancing
- Configure multiple routers for the same area
- Application will create users on the first available router
- Distribute load across multiple hotspot points

Your MikroTik hotspot management system is now fully integrated with your VPS at 209.74.86.231!