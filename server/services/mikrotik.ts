import { MikrotikRouter } from "@shared/schema";
import { RouterOSAPI } from "node-routeros";

interface MikrotikUser {
  username: string;
  password: string;
  profile: string;
  macAddress?: string;
}

interface MikrotikUserSession {
  id: string;
  username: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

export class MikrotikService {
  private routers: Map<string, MikrotikRouter> = new Map();
  private connections: Map<string, RouterOSAPI> = new Map();

  constructor() {
    // Initialize with available routers
    // Set up cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private cleanup() {
    console.log('Cleaning up MikroTik connections...');
    this.connections.forEach((connection, routerId) => {
      try {
        connection.close();
      } catch (error) {
        console.error(`Error closing connection to router ${routerId}:`, error);
      }
    });
    this.connections.clear();
  }

  private async getConnection(router: MikrotikRouter): Promise<RouterOSAPI | null> {
    try {
      // Check if we already have a connection
      let connection = this.connections.get(router.id);
      
      if (!connection) {
        let connectionHost = router.host;
        let connectionPort = router.port;

        // Handle OpenVPN client connections
        if (router.connectionType === 'ovpn_client') {
          console.log(`🔍 Attempting OpenVPN client connection for router: ${router.name}`);
          
          // If we have a detected tunnel IP, use that instead
          if (router.ovpnTunnelIp) {
            connectionHost = router.ovpnTunnelIp;
            console.log(`📡 Using detected tunnel IP: ${router.ovpnTunnelIp}`);
          } else {
            // Try to discover the router through OpenVPN tunnel
            console.log(`🔍 Attempting connection through OpenVPN server: ${router.ovpnServerHost}`);
            const detectedTunnelIp = await this.detectTunnelIp(router);
            if (detectedTunnelIp) {
              connectionHost = detectedTunnelIp;
              console.log(`✅ Auto-detected tunnel IP: ${detectedTunnelIp}`);
              // Update router with detected tunnel IP (would need to call storage here)
            } else {
              console.log(`⚠️ Could not auto-detect tunnel IP, using original host: ${router.host}`);
            }
          }
        }

        // Create new connection
        connection = new RouterOSAPI({
          host: connectionHost,
          user: router.username,
          password: router.password,
          port: connectionPort,
          timeout: 5000,
          keepalive: true,
        });

        await connection.connect();
        this.connections.set(router.id, connection);
        console.log(`✅ Connected to MikroTik router: ${router.name} (${connectionHost}:${connectionPort})`);
        
        if (router.connectionType === 'ovpn_client') {
          console.log(`🌐 OpenVPN client connection established for ${router.name}`);
        }
      }

      return connection;
    } catch (error) {
      console.error(`❌ Failed to connect to MikroTik router ${router.name}:`, error);
      // Remove failed connection
      this.connections.delete(router.id);
      return null;
    }
  }

  /**
   * Attempt to detect the tunnel IP for OpenVPN client routers
   */
  private async detectTunnelIp(router: MikrotikRouter): Promise<string | null> {
    try {
      // For now, we'll implement a simple ping-based detection
      // In a real implementation, you might:
      // 1. Query the OpenVPN server for connected clients
      // 2. Use network scanning within the VPN subnet
      // 3. Have the router report its tunnel IP via API
      
      console.log(`🔍 Auto-detecting tunnel IP for router: ${router.name}`);
      
      // Common OpenVPN client IP ranges to try
      const commonRanges = [
        '10.8.0', // Default OpenVPN range
        '10.0.0',  // Common VPN range
        '192.168.100', // Custom range
      ];
      
      // Try the original host first (in case it's already a tunnel IP)
      if (await this.testConnection(router.host, router.port, router.username, router.password)) {
        return router.host;
      }
      
      // Try common VPN IP ranges
      for (const range of commonRanges) {
        for (let i = 2; i <= 254; i++) {
          const testIp = `${range}.${i}`;
          if (await this.testConnection(testIp, router.port, router.username, router.password)) {
            return testIp;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error detecting tunnel IP for ${router.name}:`, error);
      return null;
    }
  }

  /**
   * Test if we can connect to a specific IP/port combination
   */
  private async testConnection(host: string, port: number, username: string, password: string): Promise<boolean> {
    try {
      const testConnection = new RouterOSAPI({
        host,
        user: username,
        password,
        port,
        timeout: 2000, // Short timeout for testing
        keepalive: false,
      });

      await testConnection.connect();
      await testConnection.close();
      return true;
    } catch (error) {
      return false;
    }
  }

  async connectToRouter(router: MikrotikRouter): Promise<boolean> {
    try {
      const connection = await this.getConnection(router);
      if (connection) {
        this.routers.set(router.id, router);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to connect to router ${router.name}:`, error);
      return false;
    }
  }

  async createHotspotUser(routerId: string, user: MikrotikUser): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      const connection = await this.getConnection(router);
      if (!connection) {
        throw new Error("Failed to connect to router");
      }

      // Create hotspot user via RouterOS API
      const userData: any = {
        name: user.username,
        password: user.password,
        profile: user.profile,
      };

      // Add MAC address if provided
      if (user.macAddress) {
        userData['mac-address'] = user.macAddress;
      }

      const result = await connection.write('/ip/hotspot/user/add', userData);
      console.log(`Created hotspot user ${user.username} on router ${router.name}:`, result);
      return true;
    } catch (error) {
      console.error("Failed to create hotspot user:", error);
      return false;
    }
  }

  async enableHotspotUser(routerId: string, username: string): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      const connection = await this.getConnection(router);
      if (!connection) {
        throw new Error("Failed to connect to router");
      }

      // Find user first
      const users = await connection.write('/ip/hotspot/user/print', [`?name=${username}`]);
      
      if (users.length === 0) {
        throw new Error("User not found");
      }

      const userId = users[0]['.id'];
      
      // Enable the user
      await connection.write('/ip/hotspot/user/enable', [`.id=${userId}`]);

      console.log(`Enabled hotspot user ${username} on router ${router.name}`);
      return true;
    } catch (error) {
      console.error("Failed to enable hotspot user:", error);
      return false;
    }
  }

  async disableHotspotUser(routerId: string, username: string): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      // In a real implementation, this would disable the user via RouterOS API
      console.log(`Disabling hotspot user ${username} on router ${router.name}`);
      return true;
    } catch (error) {
      console.error("Failed to disable hotspot user:", error);
      return false;
    }
  }

  async deleteHotspotUser(routerId: string, username: string): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      // In a real implementation, this would delete the user via RouterOS API
      console.log(`Deleting hotspot user ${username} on router ${router.name}`);
      return true;
    } catch (error) {
      console.error("Failed to delete hotspot user:", error);
      return false;
    }
  }

  async getActiveSessions(routerId: string): Promise<MikrotikUserSession[]> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      const connection = await this.getConnection(router);
      if (!connection) {
        throw new Error("Failed to connect to router");
      }

      // Get active hotspot sessions
      const sessions = await connection.write('/ip/hotspot/active/print');
      
      return sessions.map((session: any) => ({
        id: session['.id'],
        username: session.user || 'unknown',
        address: session.address || '',
        macAddress: session['mac-address'] || '',
        uptime: session.uptime || '0s',
        bytesIn: parseInt(session['bytes-in'] || '0'),
        bytesOut: parseInt(session['bytes-out'] || '0'),
      }));
    } catch (error) {
      console.error("Failed to get active sessions:", error);
      return [];
    }
  }

  async disconnectUser(routerId: string, sessionId: string): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      // In a real implementation, this would disconnect the user session
      console.log(`Disconnecting session ${sessionId} on router ${router.name}`);
      return true;
    } catch (error) {
      console.error("Failed to disconnect user:", error);
      return false;
    }
  }

  async testConnection(router: MikrotikRouter): Promise<boolean> {
    try {
      const connection = await this.getConnection(router);
      if (!connection) {
        return false;
      }

      // Test by getting system resource information
      const result = await connection.write('/system/resource/print');
      console.log(`Connection test successful for router ${router.name}:`, result);
      return true;
    } catch (error) {
      console.error("Router connection test failed:", error);
      this.connections.delete(router.id);
      return false;
    }
  }

  async createUserProfile(routerId: string, profileName: string, speedLimit: number): Promise<boolean> {
    try {
      const router = this.routers.get(routerId);
      if (!router) {
        throw new Error("Router not found");
      }

      // In a real implementation, this would create a user profile with speed limits
      console.log(`Creating profile ${profileName} with ${speedLimit}M speed on router ${router.name}`);
      return true;
    } catch (error) {
      console.error("Failed to create user profile:", error);
      return false;
    }
  }
}

// Export a factory function instead of immediate instantiation
let mikrotikServiceInstance: MikrotikService | null = null;

export const mikrotikService = {
  getInstance(): MikrotikService {
    if (!mikrotikServiceInstance) {
      mikrotikServiceInstance = new MikrotikService();
    }
    return mikrotikServiceInstance;
  },
  
  // Proxy all methods to the instance
  async connectToRouter(router: any) {
    return this.getInstance().connectToRouter(router);
  },
  
  async testConnection(router: any) {
    return this.getInstance().testConnection(router);
  },
  
  async createHotspotUser(routerId: string, user: any) {
    return this.getInstance().createHotspotUser(routerId, user);
  },
  
  async enableHotspotUser(routerId: string, username: string) {
    return this.getInstance().enableHotspotUser(routerId, username);
  },
  
  async disableHotspotUser(routerId: string, username: string) {
    return this.getInstance().disableHotspotUser(routerId, username);
  },
  
  async deleteHotspotUser(routerId: string, username: string) {
    return this.getInstance().deleteHotspotUser(routerId, username);
  },
  
  async createUserProfile(routerId: string, profileName: string, speedLimit: number) {
    return this.getInstance().createUserProfile(routerId, profileName, speedLimit);
  }
};
