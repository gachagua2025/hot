# MikroTik RouterOS Setup Guide for Hotspot Management

This guide will help you configure your MikroTik RouterOS device to work with the hotspot management application.

## Prerequisites

- MikroTik router with RouterOS 6.40+ or RouterOS 7.x
- Admin access to the router
- WinBox, WebFig, or SSH access
- Static IP address or DDNS setup for remote access

## Step 1: Basic Router Configuration

### 1.1 Set Router Identity
```bash
/system identity set name="Hotspot-Router-01"
```

### 1.2 Configure Interface Bridge
```bash
# Create bridge for LAN
/interface bridge add name=bridge1

# Add LAN interfaces to bridge
/interface bridge port add bridge=bridge1 interface=ether2
/interface bridge port add bridge=bridge1 interface=ether3
/interface bridge port add bridge=bridge1 interface=ether4
/interface bridge port add bridge=bridge1 interface=wlan1
```

### 1.3 Configure IP Addresses
```bash
# Set WAN IP (adjust according to your ISP)
/ip address add address=192.168.1.100/24 interface=ether1

# Set LAN IP for hotspot network
/ip address add address=10.5.50.1/24 interface=bridge1
```

## Step 2: Hotspot Configuration

### 2.1 Create Hotspot Server
```bash
# Create IP pool for hotspot users
/ip pool add name=hotspot-pool ranges=10.5.50.100-10.5.50.200

# Create hotspot profile
/ip hotspot profile add name="hotspot-profile" \
  hotspot-address=10.5.50.1 \
  dns-name=hotspot.local \
  html-directory=hotspot \
  http-cookie-lifetime=1d \
  http-proxy=0.0.0.0:0 \
  login-by=cookie,http-chap \
  split-user-domain=no \
  use-radius=no

# Create hotspot server
/ip hotspot add name="hotspot1" \
  interface=bridge1 \
  address-pool=hotspot-pool \
  profile=hotspot-profile \
  idle-timeout=00:05:00 \
  keepalive-timeout=00:02:00 \
  addresses-per-mac=2
```

### 2.2 Create User Profiles (Speed Limits)
```bash
# 1 Mbps profile
/ip hotspot user profile add name="profile_1M" \
  rate-limit="1M/1M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no

# 5 Mbps profile  
/ip hotspot user profile add name="profile_5M" \
  rate-limit="5M/5M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no

# 10 Mbps profile
/ip hotspot user profile add name="profile_10M" \
  rate-limit="10M/10M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no

# 20 Mbps profile
/ip hotspot user profile add name="profile_20M" \
  rate-limit="20M/20M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no
```

## Step 3: API Configuration

### 3.1 Enable API Service
```bash
# Enable API service
/ip service set api disabled=no port=8728

# Create API user for the application
/user add name=hotspot-api password=StrongPassword123! group=full
```

### 3.2 Configure Firewall (Security)
```bash
# Allow API access from your server IP only
/ip firewall filter add chain=input protocol=tcp dst-port=8728 \
  src-address=YOUR_SERVER_IP action=accept comment="API Access"

# Block API access from other sources
/ip firewall filter add chain=input protocol=tcp dst-port=8728 \
  action=drop comment="Block API"
```

## Step 4: Network Configuration

### 4.1 Configure NAT
```bash
# Masquerade for internet access
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade

# DNS redirect for captive portal
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 \
  action=redirect to-ports=53 comment="DNS Redirect"
```

### 4.2 Set DNS Servers
```bash
/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes
```

## Step 5: Hotspot Customization

### 5.1 Upload Custom Login Page (Optional)
```bash
# Create custom hotspot pages directory
/file print where name~"hotspot"

# Upload your custom HTML files via FTP or file manager
# Files should be placed in /hotspot/ directory
```

### 5.2 Configure Walled Garden
```bash
# Allow access to your payment gateway
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke
/ip hotspot walled-garden add dst-host=*.mpesa.co.ke

# Allow access to your application server
/ip hotspot walled-garden add dst-host=YOUR_DOMAIN.COM
```

## Step 6: Application Integration

### 6.1 Router Configuration in Admin Panel

1. **Login to Admin Panel**: Navigate to `/admin` and login
2. **Add Router**: Go to Routers section and click "Add Router"
3. **Fill Details**:
   - **Name**: Hotspot-Router-01
   - **Host**: Your router's public IP or DDNS hostname
   - **Port**: 8728 (API port)
   - **Username**: hotspot-api
   - **Password**: StrongPassword123!

### 6.2 Test Connection

1. **Test Router**: Click the test button next to your router
2. **Verify Connection**: Should show "Connection Successful"
3. **Check Status**: Router should appear as "Online" in the dashboard

## Step 7: Security Best Practices

### 7.1 Change Default Passwords
```bash
# Change admin password
/user set admin password=NewSecurePassword123!

# Disable unused services
/ip service disable telnet
/ip service disable ftp
/ip service disable www-ssl
```

### 7.2 Configure HTTPS for WebFig
```bash
# Generate self-signed certificate
/certificate add name=https-cert common-name=router.local
/certificate sign https-cert

# Enable HTTPS
/ip service set www-ssl certificate=https-cert disabled=no
```

### 7.3 Firewall Rules
```bash
# Allow established connections
/ip firewall filter add chain=input connection-state=established,related action=accept

# Allow ICMP
/ip firewall filter add chain=input protocol=icmp action=accept

# Allow access from LAN
/ip firewall filter add chain=input in-interface=bridge1 action=accept

# Allow SSH from specific IP only
/ip firewall filter add chain=input protocol=tcp dst-port=22 \
  src-address=YOUR_MANAGEMENT_IP action=accept

# Drop everything else
/ip firewall filter add chain=input action=drop
```

## Step 8: Monitoring and Maintenance

### 8.1 Setup Logging
```bash
# Configure system logging
/system logging add topics=hotspot,info action=memory

# Monitor hotspot activity
/log print where topics~"hotspot"
```

### 8.2 Backup Configuration
```bash
# Create backup
/system backup save name=hotspot-config

# Export configuration
/export file=hotspot-config
```

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check firewall rules
   - Verify API user credentials
   - Ensure API service is enabled

2. **Users Can't Access Internet**
   - Check NAT rules
   - Verify DNS configuration
   - Check hotspot server status

3. **Slow Performance**
   - Monitor CPU usage: `/system resource print`
   - Check interface statistics: `/interface print stats`
   - Verify rate limits in user profiles

### Debug Commands

```bash
# Check hotspot status
/ip hotspot print
/ip hotspot active print

# Monitor system resources
/system resource print

# Check logs
/log print where topics~"error"
```

## Integration Testing

### Test User Creation
1. Make a payment through the captive portal
2. Check if user is created: `/ip hotspot user print`
3. Verify user is enabled and has correct profile
4. Test internet access with the created credentials

### Verify API Communication
1. Check router logs for API connections
2. Monitor active sessions: `/ip hotspot active print`
3. Test connection from admin panel

## Support

For technical support with MikroTik configuration:
- MikroTik Documentation: https://help.mikrotik.com/
- MikroTik Community Forum: https://forum.mikrotik.com/
- RouterOS Manual: https://wiki.mikrotik.com/

For application-specific issues, check the application logs and ensure proper API credentials are configured.