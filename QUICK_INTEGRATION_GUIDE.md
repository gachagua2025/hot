# Quick MikroTik Integration Guide

## Overview

This guide will help you quickly integrate a MikroTik router with your hotspot management system. The application will automatically create hotspot users when customers pay via M-Pesa.

## Prerequisites

- MikroTik router with RouterOS 6.40+ or 7.x
- Router has internet connection
- Admin access to the router
- Your application server can reach the router via IP/internet

## Step 1: Quick Router Setup

### Option A: Automatic Setup (Recommended)

1. **Download the setup script**: Use the `scripts/mikrotik-setup.rsc` file from your project
2. **Upload to router**: Via WinBox, Webfig, or FTP, upload the `.rsc` file to your router
3. **Run the script**: In router terminal, run:
   ```
   /import file-name=mikrotik-setup.rsc
   ```
4. **Note the credentials**: The script will display API credentials at the end

### Option B: Manual Setup (5 Minutes)

If you prefer manual setup, run these commands in your MikroTik terminal:

```bash
# 1. Enable API and create user
/ip service set api disabled=no port=8728
/user add name=hotspot-api password=HotspotAPI2025! group=full

# 2. Set up basic hotspot (adjust IP to your network)
/ip pool add name=hotspot-pool ranges=192.168.88.100-192.168.88.200
/ip hotspot setup

# 3. Create speed profiles
/ip hotspot user profile add name="profile_1M" rate-limit="1M/1M"
/ip hotspot user profile add name="profile_5M" rate-limit="5M/5M"  
/ip hotspot user profile add name="profile_10M" rate-limit="10M/10M"
/ip hotspot user profile add name="profile_20M" rate-limit="20M/20M"

# 4. Allow M-Pesa access
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke
/ip hotspot walled-garden add dst-host=*.mpesa.co.ke
```

## Step 2: Add Router to Application

1. **Login to Admin Panel**: Open your application and go to `/admin`
2. **Navigate to Routers**: Click on "Routers" in the sidebar
3. **Click "Add Router"**: Fill in the details:
   - **Name**: Give it a descriptive name (e.g., "Main Hotspot Router")
   - **Host**: Your router's IP address (e.g., `192.168.1.1` or public IP)
   - **Port**: `8728` (default API port)
   - **Username**: `hotspot-api`
   - **Password**: `HotspotAPI2025!` (or your chosen password)
   - **Check "Active"**: Enable the router

4. **Test Connection**: Click the test button (🧪 icon) next to your router
   - Should show "Connection Successful"
   - Router status should change to "Online"

## Step 3: Test the Integration

### Test 1: Manual User Creation
1. **Go to Router Terminal** and create a test user:
   ```bash
   /ip hotspot user add name=testuser password=testpass profile=profile_5M
   ```
2. **Connect a device** to the hotspot WiFi
3. **Try to browse** - you should see the login page
4. **Login** with `testuser` / `testpass`
5. **Check internet access** - should work with 5Mbps speed

### Test 2: Application Integration
1. **Make a test payment** through your captive portal
2. **Check router** for the created user:
   ```bash
   /ip hotspot user print
   ```
3. **Verify user is enabled** and has correct speed profile
4. **Test internet access** with the generated credentials

## Common Issues & Solutions

### Router Connection Failed
- **Check firewall**: Ensure port 8728 is not blocked
- **Verify credentials**: Make sure username/password are correct
- **Test API manually**: Use WinBox to test API connection
- **Check network**: Ensure your server can reach the router IP

### Users Can't Access Internet
- **Check NAT rules**: Ensure masquerade is configured for WAN interface
- **Verify DNS**: Set DNS servers (`/ip dns set servers=8.8.8.8,8.8.4.4`)
- **Check routes**: Ensure default route exists (`/ip route print`)

### Hotspot Not Working
- **Check hotspot server**: `/ip hotspot print` should show active server
- **Verify interface**: Ensure hotspot is bound to correct interface
- **Check IP pool**: Ensure pool has available addresses

## Network Topology Example

```
Internet
    |
[Router WAN] - MikroTik Router - [LAN/WiFi] - Customers
    |                                |
[Your Server] <--- API Connection ---+
```

## Security Considerations

### For Production Use:

1. **Change default passwords**:
   ```bash
   /user set admin password=NewSecurePassword123!
   /user set hotspot-api password=NewAPIPassword123!
   ```

2. **Limit API access** to your server IP only:
   ```bash
   /ip firewall filter add chain=input protocol=tcp dst-port=8728 \
     src-address=YOUR_SERVER_IP action=accept
   /ip firewall filter add chain=input protocol=tcp dst-port=8728 \
     action=drop
   ```

3. **Enable HTTPS** for remote management:
   ```bash
   /ip service set www-ssl disabled=no
   ```

## Advanced Configuration

### Custom Login Page
1. Create custom HTML files
2. Upload to `/hotspot/` directory on router
3. Customize branding and appearance

### RADIUS Integration (Optional)
If you prefer RADIUS authentication instead of local users:
```bash
/radius add service=hotspot address=YOUR_RADIUS_SERVER secret=radius-secret
/ip hotspot profile set hotspot-profile use-radius=yes
```

## Support

- **MikroTik Documentation**: https://help.mikrotik.com/docs/display/ROS/Hotspot
- **RouterOS Manual**: https://wiki.mikrotik.com/wiki/Manual:IP/Hotspot
- **Community Forum**: https://forum.mikrotik.com/

## Testing Checklist

- [ ] Router API connection successful
- [ ] Hotspot server active and accessible
- [ ] Speed profiles created (1M, 5M, 10M, 20M)
- [ ] NAT rules configured for internet access
- [ ] Walled garden allows M-Pesa domains
- [ ] Test payment creates user on router
- [ ] User can login and access internet
- [ ] Speed limits working correctly
- [ ] Session management functional

Your MikroTik router is now fully integrated with the hotspot management system!