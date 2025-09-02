import { RouterOSAPI } from "node-routeros";
import { mikrotikService } from "./mikrotik";
import { storage } from "../storage";

interface DiscoveryCandidate {
  host: string;
  port: number;
  name?: string;
  identity?: string;
}

interface DiscoveryCredentials {
  username: string;
  password: string;
}

export class RouterDiscoveryService {
  private commonCredentials: DiscoveryCredentials[] = [
    { username: "admin", password: "" },
    { username: "admin", password: "admin" },
    { username: "admin", password: "password" },
    { username: "hotspot-api", password: "VPS2025API!" },
    { username: "hotspot-api", password: "HotspotAPI2025!" },
  ];

  private commonPorts = [8728, 8729]; // API and API-SSL ports

  async discoverRouters(): Promise<DiscoveryCandidate[]> {
    console.log("Starting MikroTik router discovery...");
    const discovered: DiscoveryCandidate[] = [];

    // Get discovery candidates from different sources
    const candidates = await this.getDiscoveryCandidates();

    for (const candidate of candidates) {
      try {
        const result = await this.testRouterConnection(candidate);
        if (result.success) {
          discovered.push({
            ...candidate,
            name: result.identity || `Router-${candidate.host}`,
            identity: result.identity,
          });
          console.log(`Discovered MikroTik router: ${result.identity} at ${candidate.host}:${candidate.port}`);
        }
      } catch (error) {
        // Silently continue to next candidate
      }
    }

    return discovered;
  }

  private async getDiscoveryCandidates(): Promise<DiscoveryCandidate[]> {
    const candidates: DiscoveryCandidate[] = [];

    // Method 1: Smart network range detection
    const localRanges = await this.getLocalNetworkRanges();
    
    for (const range of localRanges) {
      // Check common router IPs in each range
      for (const lastOctet of [1, 2, 10, 100, 254]) {
        for (const port of this.commonPorts) {
          candidates.push({
            host: `${range}${lastOctet}`,
            port,
          });
        }
      }
    }

    // Method 2: Subnet scanning for current network
    const currentNetworkCandidates = await this.scanCurrentSubnet();
    candidates.push(...currentNetworkCandidates);

    // Method 3: Check manually configured candidates
    const envHosts = process.env.MIKROTIK_DISCOVERY_HOSTS;
    if (envHosts) {
      const hosts = envHosts.split(",");
      for (const host of hosts) {
        for (const port of this.commonPorts) {
          candidates.push({ host: host.trim(), port });
        }
      }
    }

    return candidates;
  }

  private async getLocalNetworkRanges(): Promise<string[]> {
    try {
      const { execSync } = require('child_process');
      
      // Get local IP addresses
      const ipOutput = execSync('hostname -I 2>/dev/null || ip route show default 2>/dev/null || echo "192.168.1"', { encoding: 'utf8' });
      const ranges = new Set<string>();
      
      // Add common ranges
      ranges.add("192.168.1.");
      ranges.add("192.168.0.");
      ranges.add("192.168.88."); // MikroTik default
      ranges.add("10.0.0.");
      ranges.add("172.16.0.");
      
      // Parse detected IP addresses
      const ips = ipOutput.split(/\s+/).filter((ip: string) => ip.match(/^\d+\.\d+\.\d+\.\d+$/));
      for (const ip of ips) {
        const parts = ip.split('.');
        if (parts.length === 4) {
          const range = `${parts[0]}.${parts[1]}.${parts[2]}.`;
          ranges.add(range);
        }
      }
      
      return Array.from(ranges);
    } catch (error) {
      console.warn("Failed to detect local network ranges, using defaults");
      return ["192.168.1.", "192.168.0.", "192.168.88.", "10.0.0.", "172.16.0."];
    }
  }

  private async scanCurrentSubnet(): Promise<DiscoveryCandidate[]> {
    try {
      const { execSync } = require('child_process');
      const candidates: DiscoveryCandidate[] = [];
      
      // Use ARP table to find potential MikroTik devices
      const arpOutput = execSync('arp -a 2>/dev/null || echo ""', { encoding: 'utf8' });
      const arpEntries = arpOutput.split('\n').filter((line: string) => line.trim());
      
      for (const entry of arpEntries) {
        const match = entry.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
        if (match) {
          const ip = match[1];
          for (const port of this.commonPorts) {
            candidates.push({ host: ip, port });
          }
        }
      }
      
      return candidates;
    } catch (error) {
      console.warn("Failed to scan current subnet");
      return [];
    }
  }

  private async testRouterConnection(candidate: DiscoveryCandidate): Promise<{
    success: boolean;
    identity?: string;
    credentials?: DiscoveryCredentials;
    routerInfo?: any;
  }> {
    for (const creds of this.commonCredentials) {
      try {
        const connection = new RouterOSAPI({
          host: candidate.host,
          user: creds.username,
          password: creds.password,
          port: candidate.port,
          timeout: 5000,
        });

        await connection.connect();

        // Gather comprehensive router information
        const [identity, resource, interfaces, hotspotServers] = await Promise.all([
          connection.write("/system/identity/print").catch(() => []),
          connection.write("/system/resource/print").catch(() => []),
          connection.write("/interface/print").catch(() => []),
          connection.write("/ip/hotspot/print").catch(() => []),
        ]);

        await connection.close();

        const routerInfo = {
          identity: identity[0]?.name || `Router-${candidate.host}`,
          version: resource[0]?.version || "Unknown",
          board: resource[0]?.["board-name"] || "Unknown", 
          architecture: resource[0]?.["architecture-name"] || "Unknown",
          cpuLoad: resource[0]?.["cpu-load"] || "0%",
          freeMemory: resource[0]?.["free-memory"] || "0",
          totalMemory: resource[0]?.["total-memory"] || "0",
          uptime: resource[0]?.uptime || "0s",
          interfaceCount: interfaces.length || 0,
          hotspotConfigured: hotspotServers.length > 0,
          hotspotServers: hotspotServers.map((server: any) => ({
            name: server.name,
            interface: server.interface,
            profile: server.profile,
            disabled: server.disabled === "true"
          }))
        };

        console.log(`Successfully connected to MikroTik: ${routerInfo.identity} at ${candidate.host}:${candidate.port}`);
        console.log(`Router details: ${routerInfo.board} ${routerInfo.version}, Hotspot: ${routerInfo.hotspotConfigured ? 'Configured' : 'Not configured'}`);

        return {
          success: true,
          identity: routerInfo.identity,
          credentials: creds,
          routerInfo,
        };
      } catch (error) {
        // Try next credential set
        continue;
      }
    }

    return { success: false };
  }

  async autoRegisterDiscoveredRouters(): Promise<{
    registered: number;
    failed: number;
    existing: number;
  }> {
    const discovered = await this.discoverRouters();
    let registered = 0;
    let failed = 0;
    let existing = 0;

    for (const router of discovered) {
      try {
        // Check if router already exists
        const existingRouters = await storage.getAllRouters();
        const exists = existingRouters.some(r => r.host === router.host && r.port === router.port);

        if (exists) {
          existing++;
          continue;
        }

        // Test connection again to get credentials
        const connectionTest = await this.testRouterConnection(router);
        if (!connectionTest.success || !connectionTest.credentials) {
          failed++;
          continue;
        }

        // Create router entry with enhanced information
        const routerData = {
          name: connectionTest.routerInfo?.identity || `Auto-${router.host}`,
          host: router.host,
          port: router.port,
          username: connectionTest.credentials.username,
          password: connectionTest.credentials.password,
          isActive: true,
        };

        const newRouter = await storage.createRouter(routerData);

        // Test the connection through our service
        const serviceTest = await mikrotikService.testConnection(newRouter);
        if (serviceTest) {
          await storage.updateRouterLastSeen(newRouter.id);
          registered++;
          console.log(`Auto-registered MikroTik router: ${routerData.name}`);
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to register router ${router.host}:`, error);
        failed++;
      }
    }

    return { registered, failed, existing };
  }

  async scanSpecificHost(host: string, port: number = 8728): Promise<{
    success: boolean;
    router?: any;
    error?: string;
  }> {
    try {
      console.log(`Scanning specific host: ${host}:${port}`);
      
      const candidate: DiscoveryCandidate = { host, port };
      const connectionTest = await this.testRouterConnection(candidate);
      
      if (!connectionTest.success) {
        return {
          success: false,
          error: "Unable to connect to MikroTik router at this address"
        };
      }

      return {
        success: true,
        router: {
          name: connectionTest.identity || `Router-${host}`,
          host,
          port,
          username: connectionTest.credentials!.username,
          password: connectionTest.credentials!.password,
          identity: connectionTest.identity,
          routerInfo: connectionTest.routerInfo,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  async setupRouterForHotspot(routerHost: string, credentials: DiscoveryCredentials): Promise<boolean> {
    try {
      const connection = new RouterOSAPI({
        host: routerHost,
        user: credentials.username,
        password: credentials.password,
        port: 8728,
        timeout: 10000,
      });

      await connection.connect();

      // Create hotspot profiles if they don't exist
      const profiles = [
        { name: "profile_1M", limit: "1M/1M" },
        { name: "profile_5M", limit: "5M/5M" },
        { name: "profile_10M", limit: "10M/10M" },
        { name: "profile_20M", limit: "20M/20M" },
        { name: "profile_50M", limit: "50M/50M" },
      ];

      for (const profile of profiles) {
        try {
          await connection.write("/ip/hotspot/user/profile/add", [
            `name=${profile.name}`,
            `rate-limit=${profile.limit}`,
            "session-timeout=00:00:00",
            "shared-users=1",
            "transparent-proxy=no",
          ]);
          console.log(`Created profile: ${profile.name}`);
        } catch (error) {
          // Profile might already exist, continue
        }
      }

      // Add walled garden entries for M-Pesa
      const walledGardenHosts = [
        "*.safaricom.co.ke",
        "*.mpesa.co.ke",
        "sandbox.safaricom.co.ke",
        "api.safaricom.co.ke",
        "209.74.86.231", // Your VPS
      ];

      for (const host of walledGardenHosts) {
        try {
          await connection.write("/ip/hotspot/walled-garden/add", [
            `dst-host=${host}`,
            `comment=Auto-setup`,
          ]);
        } catch (error) {
          // Entry might already exist
        }
      }

      await connection.close();
      return true;
    } catch (error) {
      console.error("Failed to setup router for hotspot:", error);
      return false;
    }
  }
}

export const routerDiscoveryService = new RouterDiscoveryService();