# VPS Integration Guide for MikroTik Hotspot System

## Your VPS Configuration

**Server IP**: 209.74.86.231
**Application URL**: Will be accessible at http://209.74.86.231:5000

## Step-by-Step Integration

### Step 1: Prepare Your MikroTik Router

#### A. Basic Router Setup
1. **Connect to your MikroTik router** via WinBox, WebFig, or SSH
2. **Set router identity**:
   ```bash
   /system identity set name="MyHotspot-Router"
   ```

3. **Configure basic hotspot** (if not already done):
   ```bash
   # Quick hotspot setup - adjust IP range for your network
   /ip hotspot setup
   # Follow the wizard, use these settings:
   # - Hotspot interface: bridge (or wlan1)
   # - Local address: 192.168.88.1/24
   # - Pool range: 192.168.88.100-192.168.88.200
   # - Certificate: none
   # - SMTP server: 0.0.0.0
   # - DNS servers: 8.8.8.8
   # - DNS name: hotspot.local
   # - Local user: admin
   # - Password: (set a password)
   ```

#### B. Enable API Access
```bash
# Enable API service
/ip service set api disabled=no port=8728

# Create API user for the application
/user add name=hotspot-api password=VPS2025API! group=full

# Allow API access from your VPS
/ip firewall filter add chain=input protocol=tcp dst-port=8728 \
  src-address=209.74.86.231 action=accept comment="VPS API Access"
```

#### C. Create Speed Profiles
```bash
# Create user profiles for different speeds
/ip hotspot user profile add name="profile_1M" rate-limit="1M/1M" session-timeout=00:00:00
/ip hotspot user profile add name="profile_5M" rate-limit="5M/5M" session-timeout=00:00:00  
/ip hotspot user profile add name="profile_10M" rate-limit="10M/10M" session-timeout=00:00:00
/ip hotspot user profile add name="profile_20M" rate-limit="20M/20M" session-timeout=00:00:00
```

#### D. Configure Walled Garden for M-Pesa
```bash
# Allow M-Pesa services
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke comment="M-Pesa"
/ip hotspot walled-garden add dst-host=*.mpesa.co.ke comment="M-Pesa"
/ip hotspot walled-garden add dst-host=sandbox.safaricom.co.ke comment="M-Pesa Sandbox"

# Allow access to your VPS application
/ip hotspot walled-garden add dst-host=209.74.86.231 comment="Hotspot Management"
```

### Step 2: Configure Router for Auto-Discovery

#### A. Set Router Discovery Info
```bash
# Set system note with discovery information
/system note set note="HOTSPOT-AUTO-DISCOVERY|hotspot-api|VPS2025API!"

# Alternative: Use SNMP community (if you prefer)
/snmp set enabled=yes contact="hotspot-manager" location="auto-discovery"
```

#### B. Ensure Router is Accessible
1. **Get your router's public IP** (if using internet connection)
2. **Configure port forwarding** on your ISP router if MikroTik is behind NAT:
   - Forward port 8728 to your MikroTik router's LAN IP
3. **Or use dynamic DNS** if you have a dynamic IP

### Step 3: Application Auto-Discovery Setup

The application now includes auto-discovery features:

#### A. Network Scanning
- Scans common MikroTik IP ranges
- Attempts connection on port 8728
- Uses default credentials and discovery protocols

#### B. Manual Router Registration
If auto-discovery doesn't work, manually add your router:

1. **Login to admin panel**: http://209.74.86.231:5000/admin
2. **Go to Routers section**
3. **Click "Add Router"**
4. **Fill in details**:
   - **Name**: MyHotspot-Router
   - **Host**: [Your router's public IP or DDNS hostname]
   - **Port**: 8728
   - **Username**: hotspot-api
   - **Password**: VPS2025API!
   - **Active**: ✓ (checked)

### Step 4: Test Integration

#### A. Test Router Connection
1. **In admin panel**, click the test button (🧪) next to your router
2. **Should show**: "Connection Successful"
3. **Router status**: Should change to "Online"

#### B. Test Payment Flow
1. **Connect device** to your router's hotspot WiFi
2. **Open browser** - should redirect to captive portal
3. **Select a plan** and make test payment
4. **Check router** for created user:
   ```bash
   /ip hotspot user print
   ```

### Step 5: Production Configuration

#### A. Secure Your Setup
```bash
# Change default admin password
/user set admin password=SecureAdminPass123!

# Limit API access to VPS only
/ip firewall filter add chain=input protocol=tcp dst-port=8728 \
  action=drop comment="Block other API access"

# Disable unused services
/ip service disable telnet
/ip service disable ftp
```

#### B. Set Up Monitoring
```bash
# Enable logging for troubleshooting
/system logging add topics=hotspot,info action=memory
/system logging add topics=api,info action=memory
```

## Network Topology

```
Internet
    |
[Your ISP Router] ---- Port Forward 8728 ----+
    |                                         |
[MikroTik Router] ---- WiFi/LAN ---- [Customers]
    |
    API Connection (Port 8728)
    |
[VPS: 209.74.86.231] ---- [Hotspot Management App]
```

## Common IP Configurations

### Scenario 1: MikroTik with Public IP
- **Router IP**: Your public static IP
- **API Access**: Direct connection from VPS to router
- **Port**: 8728 (direct)

### Scenario 2: MikroTik Behind ISP Router
- **ISP Router**: Has public IP
- **MikroTik Router**: 192.168.1.100 (example)
- **Port Forward**: ISP router forwards port 8728 to 192.168.1.100:8728
- **API Access**: VPS connects to ISP_PUBLIC_IP:8728

### Scenario 3: Dynamic IP with DDNS
- **Router**: Uses dynamic DNS (e.g., yourrouter.ddns.net)
- **API Access**: VPS connects to yourrouter.ddns.net:8728

## Troubleshooting

### Router Connection Issues
1. **Check firewall**: Ensure port 8728 is allowed
2. **Verify credentials**: hotspot-api / VPS2025API!
3. **Test manually**: Use WinBox to test API
4. **Check network**: Ping from VPS to router IP

### Auto-Discovery Not Working
1. **Check router discovery settings**
2. **Verify network connectivity**
3. **Use manual addition instead**
4. **Check router logs**: `/log print where topics~"api"`

### Payment Integration Issues
1. **Verify M-Pesa credentials** in application
2. **Check walled garden** settings
3. **Test user creation** manually on router
4. **Monitor application logs**

## Security Checklist

- [ ] Changed default admin password
- [ ] API user created with strong password
- [ ] Firewall allows VPS access only
- [ ] Unused services disabled
- [ ] HTTPS enabled for web management
- [ ] Regular backups configured
- [ ] Monitoring and logging enabled

Your MikroTik router is now ready for integration with the VPS-hosted hotspot management system!