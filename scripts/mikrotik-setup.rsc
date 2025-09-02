# MikroTik RouterOS Setup Script for Hotspot Management Application
# Run this script on your MikroTik router to automatically configure hotspot services
# 
# Usage:
# 1. Upload this file to your MikroTik router
# 2. Run: /import file-name=mikrotik-setup.rsc
# 3. Modify the variables below according to your network setup

# ============================================================================
# CONFIGURATION VARIABLES - MODIFY THESE ACCORDING TO YOUR SETUP
# ============================================================================

# Network Configuration
:local wanInterface "ether1"
:local lanBridge "bridge1"
:local lanIP "10.5.50.1/24"
:local poolRange "10.5.50.100-10.5.50.200"
:local dnsServers "8.8.8.8,8.8.4.4"

# API Configuration
:local apiUser "hotspot-api"
:local apiPassword "HotspotAPI2025!"
:local apiPort "8728"

# Hotspot Configuration
:local hotspotName "hotspot1"
:local routerIdentity "Hotspot-Router-01"

# Server IP (your application server IP for firewall rules)
:local serverIP "0.0.0.0/0"

# ============================================================================
# SCRIPT EXECUTION - DO NOT MODIFY BELOW THIS LINE
# ============================================================================

:put "Starting MikroTik Hotspot Configuration..."

# Set router identity
:put "Setting router identity..."
/system identity set name=$routerIdentity

# Create bridge and add interfaces
:put "Configuring network bridge..."
/interface bridge add name=$lanBridge
/interface bridge port add bridge=$lanBridge interface=ether2
/interface bridge port add bridge=$lanBridge interface=ether3
/interface bridge port add bridge=$lanBridge interface=ether4

# Add wireless interface to bridge if exists
:if ([/interface wireless print count-only] > 0) do={
    /interface bridge port add bridge=$lanBridge interface=wlan1
    :put "Added wireless interface to bridge"
}

# Configure IP addresses
:put "Setting up IP addresses..."
/ip address add address=$lanIP interface=$lanBridge

# Create IP pool for hotspot
:put "Creating IP pool for hotspot users..."
/ip pool add name="hotspot-pool" ranges=$poolRange

# Create user profiles with different speed limits
:put "Creating hotspot user profiles..."

# 1 Mbps profile
/ip hotspot user profile add name="profile_1M" \
  rate-limit="1M/1M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no

# 2 Mbps profile
/ip hotspot user profile add name="profile_2M" \
  rate-limit="2M/2M" \
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

# 50 Mbps profile
/ip hotspot user profile add name="profile_50M" \
  rate-limit="50M/50M" \
  session-timeout=00:00:00 \
  shared-users=1 \
  transparent-proxy=no

# Create hotspot profile
:put "Creating hotspot server profile..."
/ip hotspot profile add name="hotspot-profile" \
  hotspot-address=[:pick $lanIP 0 [:find $lanIP "/"]] \
  dns-name="hotspot.local" \
  html-directory="hotspot" \
  http-cookie-lifetime="1d" \
  http-proxy="0.0.0.0:0" \
  login-by="cookie,http-chap" \
  split-user-domain=no \
  use-radius=no

# Create hotspot server
:put "Creating hotspot server..."
/ip hotspot add name=$hotspotName \
  interface=$lanBridge \
  address-pool="hotspot-pool" \
  profile="hotspot-profile" \
  idle-timeout="00:05:00" \
  keepalive-timeout="00:02:00" \
  addresses-per-mac=2

# Configure DNS
:put "Setting up DNS servers..."
/ip dns set servers=$dnsServers allow-remote-requests=yes

# Configure NAT
:put "Setting up NAT rules..."
/ip firewall nat add chain=srcnat out-interface=$wanInterface action=masquerade comment="Hotspot Internet Access"
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="DNS Redirect for Hotspot"

# Configure walled garden for payment services
:put "Configuring walled garden..."
/ip hotspot walled-garden add dst-host="*.safaricom.co.ke" comment="M-Pesa Services"
/ip hotspot walled-garden add dst-host="*.mpesa.co.ke" comment="M-Pesa Services"
/ip hotspot walled-garden add dst-host="sandbox.safaricom.co.ke" comment="M-Pesa Sandbox"
/ip hotspot walled-garden add dst-host="api.safaricom.co.ke" comment="M-Pesa API"

# Create API user
:put "Creating API user..."
/user add name=$apiUser password=$apiPassword group=full comment="Hotspot Management API User"

# Enable API service
:put "Enabling API service..."
/ip service set api disabled=no port=$apiPort

# Configure firewall for API access
:put "Setting up firewall rules..."

# Allow established and related connections
/ip firewall filter add chain=input connection-state=established,related action=accept place-before=0

# Allow ICMP
/ip firewall filter add chain=input protocol=icmp action=accept

# Allow access from LAN
/ip firewall filter add chain=input in-interface=$lanBridge action=accept

# Allow API access from server
:if ($serverIP != "0.0.0.0/0") do={
    /ip firewall filter add chain=input protocol=tcp dst-port=$apiPort src-address=$serverIP action=accept comment="API Access from Server"
    /ip firewall filter add chain=input protocol=tcp dst-port=$apiPort action=drop comment="Block other API access"
}

# Configure system logging
:put "Setting up system logging..."
/system logging add topics=hotspot,info action=memory
/system logging add topics=api,info action=memory

# Disable unused services for security
:put "Securing router services..."
/ip service disable telnet
/ip service disable ftp

# Create initial backup
:put "Creating configuration backup..."
/system backup save name="hotspot-initial-config"

# Print configuration summary
:put ""
:put "============================================================================"
:put "MikroTik Hotspot Configuration Complete!"
:put "============================================================================"
:put ("Router Identity: " . $routerIdentity)
:put ("LAN Network: " . $lanIP)
:put ("Hotspot Pool: " . $poolRange)
:put ("API Port: " . $apiPort)
:put ("API Username: " . $apiUser)
:put ("API Password: " . $apiPassword)
:put ""
:put "User Profiles Created:"
:put "- profile_1M (1 Mbps)"
:put "- profile_2M (2 Mbps)"
:put "- profile_5M (5 Mbps)"
:put "- profile_10M (10 Mbps)"
:put "- profile_20M (20 Mbps)"
:put "- profile_50M (50 Mbps)"
:put ""
:put "Next Steps:"
:put "1. Configure your WAN interface manually or via DHCP"
:put "2. Add this router to your hotspot management application"
:put "3. Test the connection from the admin panel"
:put "4. Customize hotspot login page if needed"
:put ""
:put "Important Security Notes:"
:put "- Change the default admin password"
:put "- Update the API password to something more secure"
:put "- Configure proper firewall rules for your network"
:put "- Set up HTTPS access if managing remotely"
:put "============================================================================"

:put "Configuration script completed successfully!"