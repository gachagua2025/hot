# MikroTik OpenVPN Client Setup Guide

## Overview

This guide explains how to connect your MikroTik router to the hotspot management system using OpenVPN client connection. This method provides secure, remote access without requiring port forwarding or being on the same network.

## Benefits of OpenVPN Connection

- **Secure Encrypted Connection**: All communication is encrypted with military-grade encryption
- **Remote Access**: Manage routers from anywhere with internet connectivity
- **No Port Forwarding**: Eliminate security risks of exposed router management ports
- **Automatic Reconnection**: Built-in reconnection if internet connection drops
- **Multiple Routers**: Connect multiple routers through a single VPN server
- **Network Isolation**: Keep router management isolated from public internet

## Prerequisites

Before starting, ensure you have:

1. **MikroTik Router** with RouterOS 6.40+ (OpenVPN client support)
2. **Internet Connection** on the router
3. **Admin Access** to RouterOS (via Winbox, WebFig, or SSH)
4. **Management System Access** (this hotspot management application)

## Step-by-Step Setup Process

### Step 1: Generate OpenVPN Configuration

1. **Login to Admin Dashboard**
   - Access the admin dashboard at `/admin`
   - Login with your admin credentials

2. **Add New Router**
   - Navigate to **Routers** section
   - Click **"Add Router"**
   - Fill in the **Basic Setup** tab:
     - **Router Name**: Enter a descriptive name (e.g., "Main Branch Router")
     - **RouterOS Username**: Your MikroTik admin username
     - **RouterOS Password**: Your MikroTik admin password

3. **Select Connection Type**
   - Go to **"Connection Type"** tab
   - Select **"OpenVPN Client (Remote/Secure)"**
   - Click **"Generate OpenVPN Configuration"**

4. **Review Configuration**
   - Switch to **"OpenVPN Config"** tab
   - Copy the MikroTik configuration script
   - Note your assigned VPN IP address

### Step 2: Configure MikroTik Router

1. **Access RouterOS**
   - Connect to your router via Winbox, WebFig, or SSH
   - Login with administrator credentials

2. **Open Terminal**
   - In Winbox: Click **"New Terminal"**
   - In WebFig: Go to **"Terminal"**
   - For SSH: Connect directly to router IP

3. **Execute Configuration Script**
   - Copy the entire configuration script from the admin panel
   - Paste it into the MikroTik terminal
   - Press Enter to execute

4. **Wait for Connection**
   - Allow 30-60 seconds for VPN connection to establish
   - Check connection status in **Interfaces** → **OVPN Client**

### Step 3: Verify Connection

1. **Check VPN Status**
   ```
   /interface ovpn-client print
   ```
   - Status should show "connected"
   - Note the assigned VPN IP address

2. **Test Management Access**
   - The router should now appear as "Connected" in the admin dashboard
   - Try testing the connection from the dashboard

3. **Verify Routing**
   ```
   /ip route print where comment~"Hotspot Management"
   ```
   - Should show route through OpenVPN interface

### Step 4: Finalize Setup

1. **Complete Router Registration**
   - Return to the admin dashboard
   - Click **"Add Router"** to save the configuration
   - The router will be registered with OpenVPN connection details

2. **Test Functionality**
   - Try connecting/disconnecting the router from the dashboard
   - Verify hotspot user management works correctly

## Example Configuration Script

Here's what a typical MikroTik configuration script looks like:

```routeros
# MikroTik OpenVPN Client Configuration Script
# Router: Main Branch Router
# Generated: 2025-01-13T14:19:30.000Z

/certificate
add name=ca-cert-ovpn cert="-----BEGIN CERTIFICATE-----
[CA Certificate Content]
-----END CERTIFICATE-----"
add name=client-cert-ovpn cert="-----BEGIN CERTIFICATE-----
[Client Certificate Content]
-----END CERTIFICATE-----" private-key="-----BEGIN PRIVATE KEY-----
[Private Key Content]
-----END PRIVATE KEY-----"

/interface ovpn-client
add name=ovpn-to-hotspot-mgmt \
    connect-to=vpn.hotspot-mgmt.com \
    port=1194 \
    user=mikrotik_abc12345 \
    password=SecurePassword123 \
    certificate=client-cert-ovpn \
    cipher=aes256 \
    auth=sha256 \
    add-default-route=no \
    disabled=no

# Wait for connection to establish
:delay 5s

# Add route for management traffic through VPN
/ip route
add dst-address=0.0.0.0/0 gateway=ovpn-to-hotspot-mgmt distance=2 comment="Hotspot Management VPN Route"

# Configure firewall to allow management access through VPN
/ip firewall filter
add chain=input src-address=10.8.0.0/24 action=accept comment="Allow Hotspot Management VPN"

# Add API access rule for the management system
/ip service
set api port=8728 disabled=no

print "OpenVPN Client configured successfully!"
print "Your router should now be accessible via VPN IP: 10.8.0.100/24"
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check internet connectivity on router
   - Verify firewall doesn't block OpenVPN traffic (UDP 1194)
   - Ensure DNS resolution is working

2. **Certificate Errors**
   - Verify certificates were imported correctly
   - Check that private key matches client certificate
   - Ensure CA certificate is valid

3. **Authentication Failed**
   - Double-check OpenVPN username and password
   - Verify credentials weren't corrupted during copy/paste

4. **Router Not Appearing in Dashboard**
   - Confirm VPN connection is established
   - Check that management routes are configured
   - Verify API service is enabled (port 8728)

### Verification Commands

```routeros
# Check VPN interface status
/interface ovpn-client print detail

# Check assigned VPN IP
/ip address print where interface~"ovpn"

# Verify routing
/ip route print where gateway~"ovpn"

# Test connectivity to VPN server
/tool traceroute vpn.hotspot-mgmt.com
```

## Security Considerations

1. **Certificate Security**
   - Keep client certificates secure
   - Don't share certificates between routers
   - Regularly rotate certificates (recommended yearly)

2. **Password Policy**
   - Use strong, unique passwords for each router
   - Consider using certificate-only authentication for enhanced security

3. **Network Isolation**
   - OpenVPN traffic is isolated from local network
   - Management access only through encrypted tunnel
   - No direct internet exposure of router management ports

## Advanced Configuration

### Custom OpenVPN Settings

You can modify the OpenVPN configuration for specific requirements:

```routeros
# Enable compression
/interface ovpn-client set ovpn-to-hotspot-mgmt use-compression=yes

# Change encryption cipher
/interface ovpn-client set ovpn-to-hotspot-mgmt cipher=aes128

# Add custom routes
/ip route add dst-address=192.168.100.0/24 gateway=ovpn-to-hotspot-mgmt
```

### Multiple VPN Connections

For redundancy, you can configure multiple OpenVPN connections:

```routeros
# Primary VPN
/interface ovpn-client add name=ovpn-primary connect-to=vpn1.hotspot-mgmt.com

# Backup VPN
/interface ovpn-client add name=ovpn-backup connect-to=vpn2.hotspot-mgmt.com
```

## Support

For additional support:

1. Check MikroTik documentation for OpenVPN client
2. Verify RouterOS version compatibility
3. Contact technical support with specific error messages
4. Review system logs for detailed troubleshooting information

## Conclusion

OpenVPN client connection provides a secure, reliable method for remote MikroTik router management. Once configured, routers can be managed from anywhere while maintaining security and avoiding complex network configurations.