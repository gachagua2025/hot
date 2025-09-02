# OpenVPN Server Setup Guide for MikroTik Communication

## Overview
This guide sets up an OpenVPN server on your AWS Ubuntu 24 VM to enable secure communication between your hotspot management system and remote MikroTik routers.

## Prerequisites
- AWS Ubuntu 24 VM with IP: 13.60.237.52
- Root/sudo access
- Basic OpenVPN package installed (from production-deploy.sh)

## Step 1: OpenVPN Server Configuration

### 1.1 Setup PKI (Public Key Infrastructure)
```bash
# Navigate to easy-rsa directory
cd /usr/share/easy-rsa

# Initialize PKI
sudo ./easyrsa init-pki

# Build CA
sudo ./easyrsa build-ca nopass
# When prompted, enter: MkashopHotspotCA

# Generate server certificate
sudo ./easyrsa gen-req server nopass
sudo ./easyrsa sign-req server server

# Generate Diffie-Hellman parameters
sudo ./easyrsa gen-dh

# Generate TLS-auth key
sudo openvpn --genkey --secret ta.key
```

### 1.2 Create Server Configuration
```bash
sudo mkdir -p /etc/openvpn/server
sudo tee /etc/openvpn/server/server.conf > /dev/null << 'EOF'
# OpenVPN Server Configuration for MikroTik Hotspot Management
port 1194
proto udp
dev tun

# SSL/TLS root certificate (ca), certificate (cert), and private key (key)
ca /usr/share/easy-rsa/pki/ca.crt
cert /usr/share/easy-rsa/pki/issued/server.crt
key /usr/share/easy-rsa/pki/private/server.key
dh /usr/share/easy-rsa/pki/dh.pem

# Network topology
topology subnet

# Configure server mode and supply a VPN subnet
server 10.8.0.0 255.255.255.0

# Maintain a record of client <-> virtual IP address associations
ifconfig-pool-persist /var/log/openvpn/ipp.txt

# Push routes to the client to allow it to reach other private subnets
push "route 192.168.0.0 255.255.0.0"
push "route 172.16.0.0 255.240.0.0"
push "route 10.0.0.0 255.0.0.0"

# The keepalive directive causes ping-like messages to be sent back and forth
keepalive 10 120

# For extra security beyond that provided by SSL/TLS, create an "HMAC firewall"
tls-auth /usr/share/easy-rsa/ta.key 0

# Enable compression on the VPN link and push the option to the client
compress lz4-v2
push "compress lz4-v2"

# The maximum number of concurrently connected clients
max-clients 100

# It's a good idea to reduce the OpenVPN daemon's privileges after initialization
user nobody
group nogroup

# The persist options will try to avoid accessing certain resources on restart
persist-key
persist-tun

# Output a short status file showing current connections
status /var/log/openvpn/openvpn-status.log

# Log verbosity
verb 3

# Silence repeating messages
mute 20

# Enable client-to-client communication
client-to-client

# Allow clients to use the VPN as default gateway
# push "redirect-gateway def1 bypass-dhcp"

# Push DNS servers to clients
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"
EOF
```

### 1.3 Copy Certificates
```bash
sudo cp /usr/share/easy-rsa/pki/ca.crt /etc/openvpn/server/
sudo cp /usr/share/easy-rsa/pki/issued/server.crt /etc/openvpn/server/
sudo cp /usr/share/easy-rsa/pki/private/server.key /etc/openvpn/server/
sudo cp /usr/share/easy-rsa/pki/dh.pem /etc/openvpn/server/
sudo cp /usr/share/easy-rsa/ta.key /etc/openvpn/server/
```

## Step 2: Network Configuration

### 2.1 Enable IP Forwarding
```bash
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 2.2 Configure Firewall Rules
```bash
# Allow OpenVPN through UFW
sudo ufw allow 1194/udp

# Configure NAT for VPN clients
sudo tee /etc/ufw/before.rules > /dev/null << 'EOF'
# START OPENVPN RULES
# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]
# Allow traffic from OpenVPN client to any interface
-A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
COMMIT
# END OPENVPN RULES

# Don't delete these required lines, otherwise there will be errors
*filter
:ufw-before-input - [0:0]
:ufw-before-output - [0:0]
:ufw-before-forward - [0:0]
:ufw-not-local - [0:0]

# Allow all on loopback
-A ufw-before-input -i lo -j ACCEPT
-A ufw-before-output -o lo -j ACCEPT

# Allow MULTICAST mDNS for service discovery
-A ufw-before-input -p udp -d 224.0.0.251 --dport 5353 -j ACCEPT

# Allow MULTICAST UPnP for service discovery
-A ufw-before-input -p udp -d 239.255.255.250 --dport 1900 -j ACCEPT

# START OPENVPN RULES
# Allow TUN interface connections to OpenVPN server
-A ufw-before-input -i tun+ -j ACCEPT

# Allow TUN interface connections to be forwarded through other interfaces
-A ufw-before-forward -i tun+ -j ACCEPT
-A ufw-before-forward -i tun+ -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
-A ufw-before-forward -i eth0 -o tun+ -m state --state RELATED,ESTABLISHED -j ACCEPT
# END OPENVPN RULES

# Continue with the rest of the before.rules file
EOF

# Update UFW default forward policy
sudo sed -i 's/DEFAULT_FORWARD_POLICY="DROP"/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw

# Restart UFW
sudo ufw --force reload
```

## Step 3: Start OpenVPN Server

### 3.1 Enable and Start Service
```bash
sudo systemctl enable openvpn-server@server
sudo systemctl start openvpn-server@server
sudo systemctl status openvpn-server@server
```

### 3.2 Verify Installation
```bash
# Check if OpenVPN is listening
sudo netstat -tulpn | grep :1194

# Check OpenVPN logs
sudo journalctl -u openvpn-server@server -f
```

## Step 4: Generate Client Certificates for MikroTik Routers

### 4.1 Generate Client Certificate
```bash
# For each MikroTik router, generate a unique certificate
# Replace "mikrotik-client-1" with a unique name for each router

CLIENT_NAME="mikrotik-client-1"

cd /usr/share/easy-rsa
sudo ./easyrsa gen-req $CLIENT_NAME nopass
sudo ./easyrsa sign-req client $CLIENT_NAME
```

### 4.2 Create Client Configuration Template
```bash
sudo mkdir -p /etc/openvpn/clients

# Create a base client configuration
sudo tee /etc/openvpn/clients/mikrotik-template.ovpn > /dev/null << 'EOF'
client
dev tun
proto udp
remote 13.60.237.52 1194
resolv-retry infinite
nobind
persist-key
persist-tun
compress lz4-v2
verb 3

# Certificates and keys (will be embedded)
<ca>
# CA certificate content will go here
</ca>

<cert>
# Client certificate content will go here
</cert>

<key>
# Client private key content will go here
</key>

<tls-auth>
# TLS auth key content will go here
</tls-auth>
key-direction 1
EOF
```

### 4.3 Generate Complete Client Configuration
```bash
# Script to generate complete .ovpn file for MikroTik
sudo tee /usr/local/bin/generate-mikrotik-ovpn.sh > /dev/null << 'EOF'
#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <client-name>"
    exit 1
fi

CLIENT_NAME=$1
BASE_CONFIG="/etc/openvpn/clients/mikrotik-template.ovpn"
OUTPUT_FILE="/etc/openvpn/clients/${CLIENT_NAME}.ovpn"

# Copy base configuration
cp $BASE_CONFIG $OUTPUT_FILE

# Embed certificates
echo "<ca>" >> $OUTPUT_FILE
cat /usr/share/easy-rsa/pki/ca.crt >> $OUTPUT_FILE
echo "</ca>" >> $OUTPUT_FILE

echo "<cert>" >> $OUTPUT_FILE
cat /usr/share/easy-rsa/pki/issued/${CLIENT_NAME}.crt >> $OUTPUT_FILE
echo "</cert>" >> $OUTPUT_FILE

echo "<key>" >> $OUTPUT_FILE
cat /usr/share/easy-rsa/pki/private/${CLIENT_NAME}.key >> $OUTPUT_FILE
echo "</key>" >> $OUTPUT_FILE

echo "<tls-auth>" >> $OUTPUT_FILE
cat /usr/share/easy-rsa/ta.key >> $OUTPUT_FILE
echo "</tls-auth>" >> $OUTPUT_FILE
echo "key-direction 1" >> $OUTPUT_FILE

echo "Client configuration generated: $OUTPUT_FILE"
EOF

sudo chmod +x /usr/local/bin/generate-mikrotik-ovpn.sh
```

## Step 5: MikroTik Router Configuration

### 5.1 Basic OpenVPN Client Setup
Access your MikroTik router and run these commands:

```routeros
# Create certificate store
/certificate add-ca pem-file-path="ca.crt"
/certificate import file-name="client.crt"
/certificate import file-name="client.key"

# Create OpenVPN client interface
/interface ovpn-client add \
    name="ovpn-hotspot" \
    connect-to="13.60.237.52" \
    port=1194 \
    mode=ip \
    protocol=udp \
    user="" \
    password="" \
    certificate="client.crt" \
    auth=sha1 \
    cipher=aes128 \
    add-default-route=no \
    comment="Hotspot Management VPN"

# Enable the interface
/interface ovpn-client enable ovpn-hotspot
```

### 5.2 Configure Firewall Rules
```routeros
# Allow management access from VPN network
/ip firewall filter add \
    chain=input \
    src-address=10.8.0.0/24 \
    protocol=tcp \
    dst-port=8291 \
    action=accept \
    comment="Allow API access from VPN"

/ip firewall filter add \
    chain=input \
    src-address=10.8.0.0/24 \
    protocol=tcp \
    dst-port=22 \
    action=accept \
    comment="Allow SSH access from VPN"
```

## Step 6: Testing and Verification

### 6.1 Server-side Testing
```bash
# Check connected clients
sudo cat /var/log/openvpn/openvpn-status.log

# Check server logs
sudo tail -f /var/log/openvpn/openvpn.log

# Test VPN connectivity
ping 10.8.0.2  # First client IP
```

### 6.2 MikroTik Testing
```routeros
# Check interface status
/interface ovpn-client print status

# Test connectivity to hotspot server
/ping 10.8.0.1

# Check routing
/ip route print where dynamic
```

## Step 7: Application Integration

### 7.1 Update Hotspot Application Configuration
Add these environment variables to your `.env` file:

```env
# OpenVPN Configuration
OVPN_ENABLED=true
OVPN_SERVER_IP=13.60.237.52
OVPN_NETWORK=10.8.0.0/24
OVPN_CLIENT_CONFIG_PATH=/etc/openvpn/clients

# MikroTik Connection Settings
MIKROTIK_VPN_PRIORITY=true
MIKROTIK_API_PORT=8291
MIKROTIK_SSH_PORT=22
```

### 7.2 Router Discovery via VPN
The application will automatically detect MikroTik routers connected via VPN using the 10.8.0.0/24 network range.

## Troubleshooting

### Common Issues:

#### 1. OpenVPN Service Won't Start
```bash
# Check configuration syntax
sudo openvpn --config /etc/openvpn/server/server.conf --verb 3

# Check log files
sudo journalctl -u openvpn-server@server -n 50
```

#### 2. Clients Can't Connect
```bash
# Check firewall
sudo ufw status
sudo iptables -L -n -v

# Check server is listening
sudo netstat -tulpn | grep :1194
```

#### 3. No Internet Access for Clients
```bash
# Check IP forwarding
cat /proc/sys/net/ipv4/ip_forward

# Check NAT rules
sudo iptables -t nat -L
```

#### 4. MikroTik Connection Issues
- Verify certificates are properly imported
- Check MikroTik firewall rules
- Ensure correct server IP and port
- Verify network connectivity to port 1194

## Security Best Practices

1. **Certificate Management**
   - Use unique certificates for each router
   - Regularly rotate certificates (annually)
   - Revoke compromised certificates immediately

2. **Network Segmentation**
   - Use separate VPN subnets for different router groups
   - Implement proper firewall rules
   - Monitor VPN connections regularly

3. **Monitoring**
   - Set up log monitoring for OpenVPN
   - Monitor connection attempts and failures
   - Alert on suspicious activity

## Maintenance

### Certificate Renewal (Annual)
```bash
# Renew CA certificate (every 10 years)
cd /usr/share/easy-rsa
sudo ./easyrsa renew ca

# Renew server certificate (every 2 years)
sudo ./easyrsa renew server

# Restart OpenVPN
sudo systemctl restart openvpn-server@server
```

### Performance Monitoring
```bash
# Monitor VPN performance
sudo iftop -i tun0

# Check connection statistics
sudo cat /var/log/openvpn/openvpn-status.log
```

Your OpenVPN server is now ready to securely connect MikroTik routers to your hotspot management system!