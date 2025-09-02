import { randomUUID } from "crypto";
import { MikrotikRouter } from "@shared/schema";

export interface OpenVPNConfig {
  serverHost: string;
  serverPort: number;
  clientCertificate: string;
  clientPrivateKey: string;
  caCertificate: string;
  username: string;
  password: string;
  tunnelIp: string;
  routerName: string;
}

export class OpenVPNConfigService {
  private readonly serverHost = process.env.OVPN_SERVER_HOST || "vpn.hotspot-mgmt.com";
  private readonly serverPort = parseInt(process.env.OVPN_SERVER_PORT || "1194");
  private readonly baseNetwork = "10.8.0.0/24";
  
  /**
   * Generate OpenVPN configuration for a new MikroTik router
   */
  generateRouterConfig(routerName: string, routerosVersion: string = "7.x"): OpenVPNConfig {
    const clientId = randomUUID().slice(0, 8);
    const username = `mikrotik_${clientId}`;
    const password = this.generateSecurePassword();
    const tunnelIp = this.generateTunnelIP();
    
    const config: OpenVPNConfig = {
      serverHost: this.serverHost,
      serverPort: this.serverPort,
      clientCertificate: this.generateClientCertificate(username),
      clientPrivateKey: this.generateClientPrivateKey(),
      caCertificate: this.generateCACertificate(),
      username,
      password,
      tunnelIp,
      routerName,
    };
    
    return config;
  }
  
  /**
   * Generate MikroTik RouterOS script for OpenVPN client setup
   */
  generateMikroTikScript(config: OpenVPNConfig, routerosVersion: string = "7.x"): string {
    // Clean and format certificates for RouterOS
    const cleanCaCert = config.caCertificate.replace(/\r?\n/g, '').replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').trim();
    const cleanClientCert = config.clientCertificate.replace(/\r?\n/g, '').replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').trim();
    const cleanPrivateKey = config.clientPrivateKey.replace(/\r?\n/g, '').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').trim();
    
    const isV7 = routerosVersion === "7.x";
    
    return `# MikroTik OpenVPN Client Configuration Script
# Router: ${config.routerName}
# RouterOS Version: ${routerosVersion}
# Generated: ${new Date().toISOString()}

${this.generateVersionSpecificCertificateCommands(cleanCaCert, cleanClientCert, cleanPrivateKey, isV7)}

${this.generateVersionSpecificOpenVPNInterface(config, isV7)}

# Alternative Method: Upload Certificate Files via Webfig/Winbox
# If the above commands fail, use this method:
# 1. Save the certificates to files on your computer:
#    - ca-cert.crt (CA Certificate)
#    - client-cert.crt (Client Certificate)
#    - client-key.key (Private Key)
# 2. In Winbox: Files → Upload the certificate files
# 3. In Terminal:
#    /certificate import file-name=ca-cert.crt name=ca-cert-ovpn
#    /certificate import file-name=client-cert.crt name=client-cert-ovpn
#    /certificate import file-name=client-key.key name=client-key-ovpn
#    /certificate import file-name=client-cert.crt private-key-file=client-key.key name=client-cert-ovpn

/interface ovpn-client
add name=ovpn-to-hotspot-mgmt \\
    connect-to=${config.serverHost} \\
    port=${config.serverPort} \\
    user=${config.username} \\
    password=${config.password} \\
    certificate=client-cert-ovpn \\
    cipher=aes256 \\
    auth=sha256 \\
    add-default-route=no \\
    disabled=no

# Wait for connection to establish
:delay 5s

# Add route for management traffic through VPN
/ip route
add dst-address=0.0.0.0/0 gateway=ovpn-to-hotspot-mgmt distance=2 comment="Hotspot Management VPN Route"

# Configure firewall to allow management access through VPN
/ip firewall filter
add chain=input src-address=${config.tunnelIp.split('/')[0]}/24 action=accept comment="Allow Hotspot Management VPN"

# Add API access rule for the management system
/ip service
set api port=8728 disabled=no

print "OpenVPN Client configured successfully!"
print "Your router should now be accessible via VPN IP: ${config.tunnelIp}"
`;
  }
  
  /**
   * Generate step-by-step setup guide for users
   */
  generateSetupGuide(config: OpenVPNConfig): string {
    return `# MikroTik OpenVPN Client Setup Guide

## Router: ${config.routerName}

### Step 1: Access Your MikroTik Router
1. Connect to your MikroTik router via Winbox or WebFig
2. Open Terminal (New Terminal)

### Step 2: Upload Certificates
Copy and paste the following script into your MikroTik terminal:

\`\`\`
${this.generateMikroTikScript(config)}
\`\`\`

### Step 3: Verify Connection
1. Go to **Interfaces** → **OVPN Client**
2. Check that "ovpn-to-hotspot-mgmt" shows status "Connected"
3. Note your assigned VPN IP address

### Step 4: Test Management Access
1. Your router will be accessible via VPN IP: **${config.tunnelIp}**
2. The management system will connect automatically
3. Check the admin dashboard to verify the router appears as "Connected"

### Troubleshooting
- Ensure your router has internet access
- Check firewall rules aren't blocking OpenVPN traffic
- Verify certificates were imported correctly
- Contact support if connection fails after 5 minutes

### Connection Details
- **OpenVPN Server**: ${config.serverHost}:${config.serverPort}
- **VPN Username**: ${config.username}
- **VPN IP**: ${config.tunnelIp}
- **Status**: Ready for connection
`;
  }
  
  private generateSecurePassword(length: number = 16): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
  
  private generateTunnelIP(): string {
    // Generate IP from 10.8.0.10 to 10.8.0.254
    const lastOctet = Math.floor(Math.random() * 244) + 10;
    return `10.8.0.${lastOctet}/24`;
  }
  
  private generateClientCertificate(username: string): string {
    // In production, this should generate real certificates
    // For demo purposes, returning a template
    return `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIuJruydjsw2hUwsHxD4j8TRUldo2GvC1GJo6LiC1wBI
jzBX7DXL1pRfF7YJ2+vOO2CEfY7S8pJMZCgF1r6/OJq5M7pT7m4E2jUBxrSXI3lS
ym5w1mHxiIwLdFtPWEh1RDEBU3gKmMzGz5b3MIJWLOZNxGBvJbL8b+1Jx4dIhLI1
3qxk8dxQWKMN6zV2VjqLsUUuxOHTUxBZj67mzG5BxdpKBFqoOBFkElwBGOmOqT4i
pBCPGk6Iy6xkHbfE7o/tAFUJPa0b
-----END CERTIFICATE-----`;
  }
  
  private generateClientPrivateKey(): string {
    // In production, this should generate real private keys
    return `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCyeIBxyjjV43Gv
R4BQdH1u2NeIdvSZaPdYIWD5dIQBL6wCLYbToEN6TrKk0Da6Ab6N20jIBxc2TPTu
iCPHPus39bUZ+ElbGM7XuXY4HWGepP6CNqXlSlbkReH5/bQW+nTanJs1OS/6sCBQ
Bmx60ICypvmv7EcZj1A4B9yihzlY+LrVqflIZzCW7pR4Xm+Jo1HAMIZmoUVmuVTr
o8OR+UjZ/9HoMC19LXRwNdeIJPeexFluu3OHF/IyRii4Q/q3HarKtPKfJA4tS/dx
XF5p/+qVAss4iq5QOG/b+y1iG8XHHlThd+BnyA+chyPWP0AgfyCAxIBMPjskJo4G
LmyayKoNAgMBAAECggEBAKsqEoP5Tbi6KK4fnDmKj9W3dxRFxFNAkwNX7t9CW/5S
P9IH3VLGgw+0VtCPg+2j6NM9sGk9oPzYu8Aw6b7wuGBzJhW8r3eJmGjSRcN5g6H4
qs5B7nLz8m3w8D5zG9hJpqK9jb8E5W5jHdE3VKpq+LQ8G1V4b7J9N3gp4wqVjJ3z
gkPZdx8bMjO5LQSQqbwGKkF7NkKrJRN4gKQ8jyMY1zRhw4m0+nO8MgxQ2FsY9H1H
M9fYCyG7sJ/+C8jZLKJ8WfGVz8J5X9Cb2BfE4YzQkOiw4x9P2bJ5K4V9xM7J6V1H
+2dGQy8iF3mL6c4J4rJpFkF7c9bV7Q8zXFg4cJsYK4kCgYEA3Sv9mgHmLKWzWyqy
kCZeYr4vJ6R5e1QrMVp9C3MO5fJFk8QJ8LjY4oP+I3qg6+dQw6sYz8EqW2k4Q2V5
-----END PRIVATE KEY-----`;
  }
  
  private generateCACertificate(): string {
    // In production, this should be the real CA certificate
    return `-----BEGIN CERTIFICATE-----
MIIDSjCCAjKgAwIBAgIQRK+wgNajJ7qJMDmGLvhAazANBgkqhkiG9w0BAQUFADA/
MSQwIgYDVQQKExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAVBgNVBAMT
DkRTVCBSb290IENBIFgzMB4XDTAwMDkzMDE4MTIxOVoXDTIxMDkzMDE4MTIxOVow
PzEkMCIGA1UEChMbRGlnaXRhbCBTaWduYXR1cmUgVHJ1c3QgQ28uMRcwFQYDVQQD
Ew5EU1QgUm9vdCBDQSBYMzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
AN+v6ZdQCINXtMxiZfaQguzH0yxrMMpb7NnDfcdAwRgUi+DoM3ZJKuM/IUmTrE4O
rz5Iy2Xu/NMhD2XSKtkyj4zl93ewEnu1lcCJo6m67XMuegwGMoOifooUMM0RoOEq
OLl5CjH9UL2AZd+3UWODyOKIYepLYYHsUmu5ouJLGiifSKOeDNoJjj4XLh7dIN9b
xiqKqy69cK3FCxolkHRyxXtqqzTWMIn/5WgTe1QLyNau7Fqckh49ZLOMxt+/yUFw
7BZy1SbsOFU5Q9D8/RhcQPGX69Wam40dutolucbY38EVAjqr2m7xPi71XAicPNaD
aeQQmxkqtilX4+U9m5/wAl0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNV
HQ8BAf8EBAMCAQYwHQYDVR0OBBYEFMSnsaR7LHH62+FLkHX/xBVghYkQMA0GCSqG
SIb3DQEBBQUAA4IBAQCjGiybFwBcqR7uKGY3Or+Dxz9LwwmglSBd49lZRNI+DT69
ikugdB/OEIKcdBodfpga3csTS7MgROSR6cz8faXbauX+5v3gTt23ADq1cEmU8uou
V2FcYP+i0jlBs5fJJUDz+EuILYSZl+TFx8qJJSLsWI6yMJdttWH5J/+b1b1RL5j
9qN5E1FylQ+ckRGUGvn9mjClVYOdZhTNAJQIc8DhvvfDv9nKJVg2K8vlIo8a7YZ
7c0PSaI+6lIpKfhJ0Oex1n/+vFhCd8zYfP0e6YBb8PNJWLNSs9q4KOF2DKvD4eJ
Wqnw9Lv9oQr2FkPx4d9x6Y6Gch4xNn93YXY2sDdLlvKc8G
-----END CERTIFICATE-----`;
  }

  /**
   * Generate individual certificate files for download
   */
  generateCertificateFiles(config: OpenVPNConfig) {
    return {
      caCert: {
        filename: `ca-cert-${config.routerName}.crt`,
        content: config.caCertificate,
        type: 'text/plain'
      },
      clientCert: {
        filename: `client-cert-${config.routerName}.crt`,
        content: config.clientCertificate,
        type: 'text/plain'
      },
      clientKey: {
        filename: `client-key-${config.routerName}.key`,
        content: config.clientPrivateKey,
        type: 'text/plain'
      },
      ovpnFile: {
        filename: `${config.routerName}.ovpn`,
        content: this.generateOpenVPNFile(config),
        type: 'text/plain'
      }
    };
  }

  /**
   * Generate standard OpenVPN .ovpn file for reference
   */
  private generateOpenVPNFile(config: OpenVPNConfig): string {
    return `# OpenVPN Client Configuration for ${config.routerName}
# This file is for reference - use the MikroTik script for RouterOS

client
dev tun
proto udp
remote ${config.serverHost} ${config.serverPort}
resolv-retry infinite
nobind
persist-key
persist-tun
cipher AES-256-CBC
auth SHA256
comp-lzo
verb 3

<ca>
${config.caCertificate}
</ca>

<cert>
${config.clientCertificate}
</cert>

<key>
${config.clientPrivateKey}
</key>
`;
  }

  /**
   * Generate RouterOS version-specific certificate import commands
   */
  private generateVersionSpecificCertificateCommands(caCert: string, clientCert: string, privateKey: string, isV7: boolean): string {
    if (isV7) {
      // RouterOS 7.x syntax - improved certificate handling
      return `# STEP 1: Import CA Certificate (RouterOS 7.x)
/certificate
add name=ca-cert-ovpn cert="-----BEGIN CERTIFICATE-----\\r\\n${caCert}\\r\\n-----END CERTIFICATE-----"

# STEP 2: Import Client Certificate and Private Key (RouterOS 7.x)
add name=client-cert-ovpn cert="-----BEGIN CERTIFICATE-----\\r\\n${clientCert}\\r\\n-----END CERTIFICATE-----" private-key="-----BEGIN PRIVATE KEY-----\\r\\n${privateKey}\\r\\n-----END PRIVATE KEY-----"

# STEP 3: Verify certificates are imported correctly
print where name~"ovpn"`;
    } else {
      // RouterOS 6.x syntax - legacy certificate handling
      return `# STEP 1: Import CA Certificate (RouterOS 6.x Legacy)
/certificate
add name=ca-cert-ovpn cert="-----BEGIN CERTIFICATE-----\\n${caCert}\\n-----END CERTIFICATE-----"

# STEP 2: Import Client Certificate and Private Key (RouterOS 6.x Legacy)
add name=client-cert-ovpn cert="-----BEGIN CERTIFICATE-----\\n${clientCert}\\n-----END CERTIFICATE-----" private-key="-----BEGIN PRIVATE KEY-----\\n${privateKey}\\n-----END PRIVATE KEY-----"

# STEP 3: Verify certificates
print`;
    }
  }

  /**
   * Generate RouterOS version-specific OpenVPN client interface
   */
  private generateVersionSpecificOpenVPNInterface(config: OpenVPNConfig, isV7: boolean): string {
    if (isV7) {
      // RouterOS 7.x - enhanced OpenVPN client configuration
      return `
# STEP 4: Create OpenVPN Client Interface (RouterOS 7.x)
/interface/ovpn-client
add name=ovpn-to-hotspot-mgmt \\
    connect-to=${config.serverHost} \\
    port=${config.serverPort} \\
    user=${config.username} \\
    password=${config.password} \\
    certificate=client-cert-ovpn \\
    cipher=aes256-cbc \\
    auth=sha256 \\
    verify-server-certificate=yes \\
    add-default-route=no \\
    use-peer-dns=no \\
    disabled=no

# STEP 5: Wait for connection and add management route
:delay 5s
/ip/route
add dst-address=0.0.0.0/0 gateway=ovpn-to-hotspot-mgmt distance=2 comment="Hotspot Management VPN Route (v7)"

# STEP 6: Enable and test connection
/interface/ovpn-client enable ovpn-to-hotspot-mgmt
:delay 3s
/interface/ovpn-client print status where name="ovpn-to-hotspot-mgmt"`;
    } else {
      // RouterOS 6.x - legacy OpenVPN client configuration
      return `
# STEP 4: Create OpenVPN Client Interface (RouterOS 6.x Legacy)
/interface ovpn-client
add name=ovpn-to-hotspot-mgmt \\
    connect-to=${config.serverHost} \\
    port=${config.serverPort} \\
    user=${config.username} \\
    password=${config.password} \\
    certificate=client-cert-ovpn \\
    cipher=aes256 \\
    auth=sha256 \\
    add-default-route=no \\
    disabled=no

# STEP 5: Wait for connection and add route
:delay 5s
/ip route
add dst-address=0.0.0.0/0 gateway=ovpn-to-hotspot-mgmt distance=2 comment="Hotspot Management VPN Route (v6)"

# STEP 6: Check interface status
/interface ovpn-client print status where name="ovpn-to-hotspot-mgmt"`;
    }
  }
}

export const ovpnConfigService = new OpenVPNConfigService();