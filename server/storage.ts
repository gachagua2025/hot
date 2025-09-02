import {
  superAdmins,
  providers,
  admins,
  paymentGateways,
  providerPaymentGateways,
  subscriptionPlans,
  mikrotikRouters,
  hotspotUsers,
  mpesaTransactions,
  userSessions,
  vouchers,
  type SuperAdmin,
  type Provider,
  type Admin,
  type PaymentGateway,
  type ProviderPaymentGateway,
  type SubscriptionPlan,
  type MikrotikRouter,
  type HotspotUser,
  type MpesaTransaction,
  type UserSession,
  type Voucher,
  type InsertSuperAdmin,
  type InsertProvider,
  type InsertAdmin,
  type InsertPaymentGateway,
  type InsertProviderPaymentGateway,
  type InsertSubscriptionPlan,
  type InsertMikrotikRouter,
  type InsertHotspotUser,
  type InsertMpesaTransaction,
  type InsertUserSession,
  type InsertVoucher,
} from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, desc, and, count, sum, gte, sql, isNotNull, or, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Super Admin operations
  getSuperAdmin(id: string): Promise<SuperAdmin | undefined>;
  getSuperAdminByUsername(username: string): Promise<SuperAdmin | undefined>;
  createSuperAdmin(superAdmin: InsertSuperAdmin): Promise<SuperAdmin>;

  // Provider operations
  getAllProviders(): Promise<Provider[]>;
  getProvider(id: string): Promise<Provider | undefined>;
  getProviderByEmail(email: string): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: string, provider: Partial<InsertProvider>): Promise<Provider | undefined>;
  suspendProvider(id: string): Promise<boolean>;
  activateProvider(id: string): Promise<boolean>;

  // Admin operations (now provider-specific)
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByProviderId(providerId: string): Promise<Admin | null>;
  getAdminsByProvider(providerId: string): Promise<Admin[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: string, admin: Partial<InsertAdmin>): Promise<Admin | undefined>;
  updateAdminPassword(adminId: string, hashedPassword: string): Promise<boolean>;
  updateAdminProfile(id: string, profileData: { name?: string; email?: string; password?: string }): Promise<Admin | undefined>;

  // Payment Gateway operations
  getAllPaymentGateways(): Promise<PaymentGateway[]>;
  getPaymentGateway(id: string): Promise<PaymentGateway | undefined>;
  createPaymentGateway(gateway: InsertPaymentGateway): Promise<PaymentGateway>;
  updatePaymentGateway(id: string, gateway: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined>;

  // Provider Payment Gateway operations
  getProviderPaymentGateways(providerId: string): Promise<(ProviderPaymentGateway & { gateway: PaymentGateway })[]>;
  createProviderPaymentGateway(config: InsertProviderPaymentGateway): Promise<ProviderPaymentGateway>;
  updateProviderPaymentGateway(id: string, config: Partial<InsertProviderPaymentGateway>): Promise<ProviderPaymentGateway | undefined>;
  deleteProviderPaymentGateway(id: string): Promise<boolean>;

  // Subscription plan operations
  getAllPlans(): Promise<SubscriptionPlan[]>;
  getActivePlans(): Promise<SubscriptionPlan[]>;
  getPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updatePlan(id: string, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deletePlan(id: string): Promise<boolean>;

  // MikroTik router operations (now provider-aware)
  getAllRouters(): Promise<(MikrotikRouter & { provider?: Provider })[]>;
  getActiveRouters(): Promise<MikrotikRouter[]>;
  getRoutersByProvider(providerId: string): Promise<MikrotikRouter[]>;
  getUnassignedRouters(): Promise<MikrotikRouter[]>;
  getRouter(id: string): Promise<MikrotikRouter | undefined>;
  createRouter(router: InsertMikrotikRouter): Promise<MikrotikRouter>;
  updateRouter(id: string, router: Partial<InsertMikrotikRouter>): Promise<MikrotikRouter | undefined>;
  assignRouterToProvider(routerId: string, providerId: string): Promise<boolean>;
  unassignRouter(routerId: string): Promise<boolean>;
  updateRouterLastSeen(id: string): Promise<void>;
  deleteRouter(id: string): Promise<boolean>;

  // Revenue and analytics
  getProviderRevenue(providerId: string): Promise<{ total: string; thisMonth: string; transactions: number }>;
  getRouterRevenue(routerId: string): Promise<{ total: string; thisMonth: string; transactions: number }>;
  getAllProvidersRevenue(): Promise<{ providerId: string; provider: Provider; revenue: string; transactions: number }[]>;

  // Hotspot user operations
  getAllUsers(): Promise<HotspotUser[]>;
  getActiveUsers(): Promise<HotspotUser[]>;
  getUser(id: string): Promise<HotspotUser | undefined>;
  getUserByMacAddress(macAddress: string): Promise<HotspotUser | undefined>;
  createUser(user: InsertHotspotUser): Promise<HotspotUser>;
  updateUser(id: string, user: Partial<InsertHotspotUser>): Promise<HotspotUser | undefined>;
  activateUser(id: string, expiresAt: Date): Promise<void>;
  deactivateUser(id: string): Promise<void>;

  // M-Pesa transaction operations
  getAllTransactions(): Promise<MpesaTransaction[]>;
  getRecentTransactions(limit?: number): Promise<MpesaTransaction[]>;
  getTransaction(id: string): Promise<MpesaTransaction | undefined>;
  getTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<MpesaTransaction | undefined>;
  createTransaction(transaction: InsertMpesaTransaction): Promise<MpesaTransaction>;
  updateTransaction(id: string, transaction: Partial<InsertMpesaTransaction>): Promise<MpesaTransaction | undefined>;

  // User session operations
  createSession(session: InsertUserSession): Promise<UserSession>;
  getActiveSessionsByUser(userId: string): Promise<UserSession[]>;
  endSession(id: string): Promise<void>;

  // Voucher operations
  createVouchers(voucherData: InsertVoucher[]): Promise<Voucher[]>;
  getVoucherByCode(code: string): Promise<Voucher | null>;
  getAllVouchers(): Promise<(Voucher & { plan: SubscriptionPlan })[]>;
  redeemVoucher(code: string, userId: string): Promise<boolean>;
  getVoucherStats(): Promise<{ total: number; used: number; unused: number; expired: number }>;

  // Settings management
  getSettings(): Promise<any>;
  updateSettings(settingsData: any): Promise<any>;

  // Statistics
  getDashboardStats(): Promise<{
    activeUsers: number;
    totalRevenue: string;
    connectedRouters: number;
    todaySales: string;
    todayTransactions: number;
  }>;
  getRouterSpecificStats(routerId: string): Promise<{
    todaySales: string;
    activeUsers: number;
    totalUsers: number;
    monthlyRevenue: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Super Admin operations
  async getSuperAdmin(id: string): Promise<SuperAdmin | undefined> {
    const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return superAdmin || undefined;
  }

  async getSuperAdminByUsername(username: string): Promise<SuperAdmin | undefined> {
    const [superAdmin] = await db.select().from(superAdmins).where(eq(superAdmins.username, username));
    return superAdmin || undefined;
  }

  async createSuperAdmin(insertSuperAdmin: InsertSuperAdmin): Promise<SuperAdmin> {
    const [superAdmin] = await db.insert(superAdmins).values(insertSuperAdmin).returning();
    return superAdmin;
  }

  // Provider operations
  async getAllProviders(): Promise<(Provider & { routerCount?: number })[]> {
    const providersWithRouterCount = await db
      .select({
        provider: providers,
        routerCount: sql<number>`count(${mikrotikRouters.id})::int`
      })
      .from(providers)
      .leftJoin(mikrotikRouters, eq(mikrotikRouters.providerId, providers.id))
      .groupBy(providers.id)
      .orderBy(providers.businessName);

    return providersWithRouterCount.map(item => ({
      ...item.provider,
      routerCount: item.routerCount
    }));
  }

  async getProvider(id: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider || undefined;
  }

  async getProviderBySubdomain(subdomain: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.subdomain, subdomain));
    return provider || undefined;
  }

  async getProviderByEmail(email: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.email, email));
    return provider || undefined;
  }

  async createProvider(insertProvider: InsertProvider): Promise<Provider> {
    const [provider] = await db.insert(providers).values(insertProvider).returning();
    return provider;
  }

  async updateProvider(id: string, providerData: Partial<InsertProvider>): Promise<Provider | undefined> {
    const [updatedProvider] = await db
      .update(providers)
      .set({ ...providerData, updatedAt: new Date() })
      .where(eq(providers.id, id))
      .returning();
    return updatedProvider || undefined;
  }

  async suspendProvider(id: string): Promise<boolean> {
    const result = await db
      .update(providers)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(providers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async activateProvider(id: string): Promise<boolean> {
    const result = await db
      .update(providers)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(providers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Admin operations (now provider-specific)
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin || undefined;
  }

  async getAdminByUsername(username: string): Promise<Admin | null> {
    const [result] = await db.select().from(admins).where(eq(admins.username, username));
    return result || null;
  }

  async getAdminByProviderId(providerId: string): Promise<Admin | null> {
    const [result] = await db.select().from(admins).where(eq(admins.providerId, providerId));
    return result || null;
  }

  async getAdminsByProvider(providerId: string): Promise<Admin[]> {
    return await db.select().from(admins).where(eq(admins.providerId, providerId));
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(insertAdmin).returning();
    return admin;
  }

  async updateAdmin(id: string, adminData: Partial<InsertAdmin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db
      .update(admins)
      .set(adminData)
      .where(eq(admins.id, id))
      .returning();
    return updatedAdmin || undefined;
  }

  async updateAdminPassword(adminId: string, hashedPassword: string): Promise<boolean> {
    try {
      const result = await db
        .update(admins)
        .set({ password: hashedPassword })
        .where(eq(admins.id, adminId));

      return true;
    } catch (error) {
      console.error("Error updating admin password:", error);
      return false;
    }
  }

  async updateAdminProfile(id: string, profileData: { name?: string; email?: string; password?: string }): Promise<Admin | undefined> {
    const updateData: Partial<InsertAdmin> = {};

    if (profileData.name) {
      updateData.name = profileData.name;
    }

    if (profileData.email) {
      updateData.email = profileData.email;
    }

    if (profileData.password) {
      updateData.password = profileData.password;
    }

    const [updatedAdmin] = await db
      .update(admins)
      .set(updateData)
      .where(eq(admins.id, id))
      .returning();
    return updatedAdmin || undefined;
  }

  // Payment Gateway operations
  async getAllPaymentGateways(): Promise<PaymentGateway[]> {
    try {
      const result = await db
        .select({
          id: paymentGateways.id,
          name: paymentGateways.name,
          type: paymentGateways.type,
          isActive: paymentGateways.isActive,
          hasAutoApi: paymentGateways.hasAutoApi,
          createdAt: paymentGateways.createdAt,
        })
        .from(paymentGateways)
        .orderBy(paymentGateways.name);
      return result;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  async getPaymentGateway(id: string): Promise<PaymentGateway | undefined> {
    const [gateway] = await db.select().from(paymentGateways).where(eq(paymentGateways.id, id)).limit(1);
    return gateway;
  }

  async createPaymentGateway(insertGateway: InsertPaymentGateway): Promise<PaymentGateway> {
    const [gateway] = await db.insert(paymentGateways).values(insertGateway).returning();
    return gateway;
  }

  async updatePaymentGateway(id: string, gatewayData: Partial<InsertPaymentGateway>): Promise<PaymentGateway | undefined> {
    const [updatedGateway] = await db
      .update(paymentGateways)
      .set(gatewayData)
      .where(eq(paymentGateways.id, id))
      .returning();
    return updatedGateway || undefined;
  }

  // Provider Payment Gateway operations
  async getProviderPaymentGateways(providerId: string): Promise<(ProviderPaymentGateway & { gateway: PaymentGateway })[]> {
    return await db
      .select({
        id: providerPaymentGateways.id,
        providerId: providerPaymentGateways.providerId,
        paymentGatewayId: providerPaymentGateways.paymentGatewayId,
        configuration: providerPaymentGateways.configuration,
        isActive: providerPaymentGateways.isActive,
        createdAt: providerPaymentGateways.createdAt,
        gateway: paymentGateways,
      })
      .from(providerPaymentGateways)
      .leftJoin(paymentGateways, eq(providerPaymentGateways.paymentGatewayId, paymentGateways.id))
      .where(eq(providerPaymentGateways.providerId, providerId));
  }

  async createProviderPaymentGateway(insertConfig: InsertProviderPaymentGateway): Promise<ProviderPaymentGateway> {
    const [config] = await db.insert(providerPaymentGateways).values(insertConfig).returning();
    return config;
  }

  async updateProviderPaymentGateway(id: string, configData: Partial<InsertProviderPaymentGateway>): Promise<ProviderPaymentGateway | undefined> {
    const [updatedConfig] = await db
      .update(providerPaymentGateways)
      .set(configData)
      .where(eq(providerPaymentGateways.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async deleteProviderPaymentGateway(id: string): Promise<boolean> {
    const result = await db.delete(providerPaymentGateways).where(eq(providerPaymentGateways.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Subscription plan operations
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.price);
  }

  async getActivePlans(): Promise<SubscriptionPlan[]>{
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  async getPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async createPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [newPlan] = await db.insert(subscriptionPlans).values(plan).returning();
    return newPlan;
  }

  async updatePlan(id: string, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updatedPlan] = await db
      .update(subscriptionPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updatedPlan || undefined;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // MikroTik router operations (now provider-aware)
  async getAllRouters(): Promise<(MikrotikRouter & { provider?: Provider })[]> {
    return await db
      .select({
        id: mikrotikRouters.id,
        name: mikrotikRouters.name,
        host: mikrotikRouters.host,
        port: mikrotikRouters.port,
        username: mikrotikRouters.username,
        password: mikrotikRouters.password,
        routerosVersion: mikrotikRouters.routerosVersion,
        connectionType: mikrotikRouters.connectionType,
        ovpnServerHost: mikrotikRouters.ovpnServerHost,
        ovpnServerPort: mikrotikRouters.ovpnServerPort,
        ovpnUsername: mikrotikRouters.ovpnUsername,
        ovpnPassword: mikrotikRouters.ovpnPassword,
        ovpnCertificate: mikrotikRouters.ovpnCertificate,
        ovpnPrivateKey: mikrotikRouters.ovpnPrivateKey,
        ovpnCaFile: mikrotikRouters.ovpnCaFile,
        ovpnTunnelIp: mikrotikRouters.ovpnTunnelIp,
        providerId: mikrotikRouters.providerId,
        location: mikrotikRouters.location,
        status: mikrotikRouters.status,
        isOnline: mikrotikRouters.isOnline,
        isActive: mikrotikRouters.isActive,
        lastSeen: mikrotikRouters.lastSeen,
        createdAt: mikrotikRouters.createdAt,
        provider: providers,
      })
      .from(mikrotikRouters)
      .leftJoin(providers, eq(mikrotikRouters.providerId, providers.id))
      .orderBy(mikrotikRouters.name);
  }

  async getActiveRouters(): Promise<MikrotikRouter[]> {
    return await db
      .select()
      .from(mikrotikRouters)
      .where(eq(mikrotikRouters.isActive, true))
      .orderBy(mikrotikRouters.name);
  }

  async getRoutersByProvider(providerId: string): Promise<MikrotikRouter[]> {
    console.log(`Storage: Getting routers for provider ${providerId}`);
    const routers = await db
      .select()
      .from(mikrotikRouters)
      .where(eq(mikrotikRouters.providerId, providerId))
      .orderBy(mikrotikRouters.name);
    console.log(`Storage: Found ${routers.length} routers for provider ${providerId}:`, routers.map(r => ({ id: r.id, name: r.name, providerId: r.providerId })));
    return routers;
  }

  async getUnassignedRouters(): Promise<MikrotikRouter[]> {
    return await db
      .select()
      .from(mikrotikRouters)
      .where(isNull(mikrotikRouters.providerId))
      .orderBy(mikrotikRouters.name);
  }

  async getRouter(id: string): Promise<MikrotikRouter | undefined> {
    const [router] = await db.select().from(mikrotikRouters).where(eq(mikrotikRouters.id, id));
    return router || undefined;
  }

  async createRouter(router: InsertMikrotikRouter): Promise<MikrotikRouter> {
    const [newRouter] = await db.insert(mikrotikRouters).values(router).returning();
    return newRouter;
  }

  async updateRouter(id: string, router: Partial<InsertMikrotikRouter>): Promise<MikrotikRouter | undefined> {
    const [updatedRouter] = await db
      .update(mikrotikRouters)
      .set(router)
      .where(eq(mikrotikRouters.id, id))
      .returning();
    return updatedRouter || undefined;
  }

  async assignRouterToProvider(routerId: string, providerId: string): Promise<boolean> {
    const result = await db
      .update(mikrotikRouters)
      .set({ providerId })
      .where(eq(mikrotikRouters.id, routerId));
    return (result.rowCount ?? 0) > 0;
  }

  async unassignRouter(routerId: string): Promise<boolean> {
    const result = await db
      .update(mikrotikRouters)
      .set({ providerId: null })
      .where(eq(mikrotikRouters.id, routerId));
    return (result.rowCount ?? 0) > 0;
  }

  async updateRouterLastSeen(id: string): Promise<void> {
    await db
      .update(mikrotikRouters)
      .set({ lastSeen: new Date(), isOnline: true })
      .where(eq(mikrotikRouters.id, id));
  }

  async deleteRouter(id: string): Promise<boolean> {
    const result = await db.delete(mikrotikRouters).where(eq(mikrotikRouters.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Revenue and analytics
  async getProviderRevenue(providerId: string): Promise<{ total: string; thisMonth: string; transactions: number }> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    // Get routers for this provider
    const providerRouters = await db
      .select({ id: mikrotikRouters.id })
      .from(mikrotikRouters)
      .where(eq(mikrotikRouters.providerId, providerId));

    const routerIds = providerRouters.map(r => r.id);

    if (routerIds.length === 0) {
      return { total: "0", thisMonth: "0", transactions: 0 };
    }

    // Get total revenue from M-Pesa transactions for users on provider's routers
    const [totalTransactionResult] = await db
      .select({
        total: sum(mpesaTransactions.amount),
        count: count()
      })
      .from(mpesaTransactions)
      .leftJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        inArray(hotspotUsers.routerId, routerIds)
      ));

    // Get this month's M-Pesa revenue
    const [monthTransactionResult] = await db
      .select({ total: sum(mpesaTransactions.amount) })
      .from(mpesaTransactions)
      .leftJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, firstDayOfMonth),
        inArray(hotspotUsers.routerId, routerIds)
      ));

    // Get total revenue from voucher redemptions for users on provider's routers
    const [totalVoucherResult] = await db
      .select({
        total: sql<string>`SUM(${subscriptionPlans.price})`,
        count: count()
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        inArray(hotspotUsers.routerId, routerIds)
      ));

    // Get this month's voucher revenue
    const [monthVoucherResult] = await db
      .select({ total: sql<string>`SUM(${subscriptionPlans.price})` })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, firstDayOfMonth),
        inArray(hotspotUsers.routerId, routerIds)
      ));

    // Calculate combined totals
    const totalMpesaRevenue = parseFloat(totalTransactionResult.total || "0");
    const totalVoucherRevenue = parseFloat(totalVoucherResult.total || "0");
    const monthMpesaRevenue = parseFloat(monthTransactionResult.total || "0");
    const monthVoucherRevenue = parseFloat(monthVoucherResult.total || "0");

    const totalRevenue = totalMpesaRevenue + totalVoucherRevenue;
    const monthRevenue = monthMpesaRevenue + monthVoucherRevenue;
    const totalTransactionCount = (totalTransactionResult.count || 0) + (totalVoucherResult.count || 0);

    return {
      total: totalRevenue.toString(),
      thisMonth: monthRevenue.toString(),
      transactions: totalTransactionCount,
    };
  }

  async getRouterRevenue(routerId: string): Promise<{ total: string; thisMonth: string; today: string; transactions: number }> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Get total revenue from M-Pesa transactions for users on this router
    const [totalTransactionResult] = await db
      .select({
        total: sum(mpesaTransactions.amount),
        count: count()
      })
      .from(mpesaTransactions)
      .leftJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get this month's M-Pesa revenue
    const [monthTransactionResult] = await db
      .select({ total: sum(mpesaTransactions.amount) })
      .from(mpesaTransactions)
      .leftJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, firstDayOfMonth),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get today's M-Pesa revenue
    const [todayTransactionResult] = await db
      .select({ total: sum(mpesaTransactions.amount) })
      .from(mpesaTransactions)
      .leftJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, startOfToday),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get total revenue from voucher redemptions for users on this router
    const [totalVoucherResult] = await db
      .select({
        total: sql<string>`SUM(${subscriptionPlans.price})`,
        count: count()
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get this month's voucher revenue
    const [monthVoucherResult] = await db
      .select({ total: sql<string>`SUM(${subscriptionPlans.price})` })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, firstDayOfMonth),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get today's voucher revenue
    const [todayVoucherResult] = await db
      .select({ total: sql<string>`SUM(${subscriptionPlans.price})` })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, startOfToday),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Calculate combined totals
    const totalMpesaRevenue = parseFloat(totalTransactionResult.total || "0");
    const totalVoucherRevenue = parseFloat(totalVoucherResult.total || "0");
    const monthMpesaRevenue = parseFloat(monthTransactionResult.total || "0");
    const monthVoucherRevenue = parseFloat(monthVoucherResult.total || "0");
    const todayMpesaRevenue = parseFloat(todayTransactionResult.total || "0");
    const todayVoucherRevenue = parseFloat(todayVoucherResult.total || "0");

    const totalRevenue = totalMpesaRevenue + totalVoucherRevenue;
    const monthRevenue = monthMpesaRevenue + monthVoucherRevenue;
    const todayRevenue = todayMpesaRevenue + todayVoucherRevenue;
    const totalTransactionCount = (totalTransactionResult.count || 0) + (totalVoucherResult.count || 0);

    return {
      total: totalRevenue.toString(),
      thisMonth: monthRevenue.toString(),
      today: todayRevenue.toString(),
      transactions: totalTransactionCount,
    };
  }

  async getAllProvidersRevenue(): Promise<{ providerId: string; provider: Provider; revenue: string; transactions: number }[]> {
    // Get M-Pesa revenue data
    const mpesaRevenue = await db
      .select({
        providerId: providers.id,
        provider: providers,
        revenue: sql<string>`COALESCE(SUM(${mpesaTransactions.amount}), '0')`,
        transactions: sql<number>`COUNT(${mpesaTransactions.id})`,
      })
      .from(providers)
      .leftJoin(mikrotikRouters, eq(providers.id, mikrotikRouters.providerId))
      .leftJoin(hotspotUsers, eq(mikrotikRouters.id, hotspotUsers.routerId))
      .leftJoin(mpesaTransactions, and(
        eq(hotspotUsers.id, mpesaTransactions.userId),
        eq(mpesaTransactions.status, "completed")
      ))
      .groupBy(providers.id, providers.businessName, providers.contactName, providers.email, providers.phone, providers.subdomain, providers.address, providers.kraPin, providers.businessLicense, providers.status, providers.paymentGatewayId, providers.captivePortalSettings, providers.createdAt, providers.updatedAt);

    // Get voucher revenue data
    const voucherRevenue = await db
      .select({
        providerId: providers.id,
        revenue: sql<string>`COALESCE(SUM(${subscriptionPlans.price}), '0')`,
        transactions: sql<number>`COUNT(${vouchers.id})`,
      })
      .from(providers)
      .leftJoin(mikrotikRouters, eq(providers.id, mikrotikRouters.providerId))
      .leftJoin(hotspotUsers, eq(mikrotikRouters.id, hotspotUsers.routerId))
      .leftJoin(vouchers, and(
        eq(vouchers.usedBy, hotspotUsers.id),
        eq(vouchers.isUsed, true)
      ))
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .groupBy(providers.id);

    // Combine the results
    const combinedResults = mpesaRevenue.map(mpesa => {
      const voucher = voucherRevenue.find(v => v.providerId === mpesa.providerId);
      const totalRevenue = parseFloat(mpesa.revenue || "0") + parseFloat(voucher?.revenue || "0");
      const totalTransactions = (mpesa.transactions || 0) + (voucher?.transactions || 0);

      return {
        providerId: mpesa.providerId,
        provider: mpesa.provider,
        revenue: totalRevenue.toString(),
        transactions: totalTransactions,
      };
    });

    // Sort by total revenue descending
    return combinedResults.sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue));
  }

  // Hotspot user operations
  async getAllUsers(): Promise<HotspotUser[]> {
    const users = await db
      .select({
        id: hotspotUsers.id,
        macAddress: hotspotUsers.macAddress,
        phoneNumber: hotspotUsers.phoneNumber,
        planId: hotspotUsers.planId,
        routerId: hotspotUsers.routerId,
        username: hotspotUsers.username,
        password: hotspotUsers.password,
        isActive: hotspotUsers.isActive,
        expiresAt: hotspotUsers.expiresAt,
        bytesUploaded: hotspotUsers.bytesUploaded,
        bytesDownloaded: hotspotUsers.bytesDownloaded,
        sessionTime: hotspotUsers.sessionTime,
        createdAt: hotspotUsers.createdAt,
        updatedAt: hotspotUsers.updatedAt,
        plan: {
          id: subscriptionPlans.id,
          name: subscriptionPlans.name,
          price: subscriptionPlans.price,
          speedMbps: subscriptionPlans.speedMbps,
          durationHours: subscriptionPlans.durationHours,
        },
        router: {
          id: mikrotikRouters.id,
          name: mikrotikRouters.name,
          host: mikrotikRouters.host,
          port: mikrotikRouters.port,
          isActive: mikrotikRouters.isActive,
          isOnline: mikrotikRouters.isOnline,
        }
      })
      .from(hotspotUsers)
      .leftJoin(subscriptionPlans, eq(hotspotUsers.planId, subscriptionPlans.id))
      .leftJoin(mikrotikRouters, eq(hotspotUsers.routerId, mikrotikRouters.id))
      .orderBy(desc(hotspotUsers.createdAt));

    return users.map(user => ({
      ...user,
      plan: user.plan.id ? user.plan : null,
      router: user.router.id ? user.router : null
    })) as any;
  }

  async getActiveUsers(): Promise<HotspotUser[]> {
    const users = await db
      .select({
        id: hotspotUsers.id,
        macAddress: hotspotUsers.macAddress,
        phoneNumber: hotspotUsers.phoneNumber,
        planId: hotspotUsers.planId,
        routerId: hotspotUsers.routerId,
        username: hotspotUsers.username,
        password: hotspotUsers.password,
        isActive: hotspotUsers.isActive,
        expiresAt: hotspotUsers.expiresAt,
        bytesUploaded: hotspotUsers.bytesUploaded,
        bytesDownloaded: hotspotUsers.bytesDownloaded,
        sessionTime: hotspotUsers.sessionTime,
        createdAt: hotspotUsers.createdAt,
        updatedAt: hotspotUsers.updatedAt,
        plan: {
          id: subscriptionPlans.id,
          name: subscriptionPlans.name,
          price: subscriptionPlans.price,
          speedMbps: subscriptionPlans.speedMbps,
          durationHours: subscriptionPlans.durationHours,
        },
        router: {
          id: mikrotikRouters.id,
          name: mikrotikRouters.name,
          host: mikrotikRouters.host,
          port: mikrotikRouters.port,
          isActive: mikrotikRouters.isActive,
          isOnline: mikrotikRouters.isOnline,
        }
      })
      .from(hotspotUsers)
      .leftJoin(subscriptionPlans, eq(hotspotUsers.planId, subscriptionPlans.id))
      .leftJoin(mikrotikRouters, eq(hotspotUsers.routerId, mikrotikRouters.id))
      .where(and(
        eq(hotspotUsers.isActive, true),
        gte(hotspotUsers.expiresAt, new Date())
      ))
      .orderBy(desc(hotspotUsers.createdAt));

    return users.map(user => ({
      ...user,
      plan: user.plan.id ? user.plan : null,
      router: user.router.id ? user.router : null
    })) as any;
  }

  async getUser(id: string): Promise<HotspotUser | undefined> {
    const [user] = await db.select().from(hotspotUsers).where(eq(hotspotUsers.id, id));
    return user || undefined;
  }

  async getUserByMacAddress(macAddress: string): Promise<HotspotUser | undefined> {
    const [user] = await db.select().from(hotspotUsers).where(eq(hotspotUsers.macAddress, macAddress));
    return user || undefined;
  }

  async createUser(user: InsertHotspotUser): Promise<HotspotUser> {
    const [newUser] = await db.insert(hotspotUsers).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertHotspotUser>): Promise<HotspotUser | undefined> {
    const [updatedUser] = await db
      .update(hotspotUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(hotspotUsers.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async activateUser(id: string, expiresAt: Date): Promise<void> {
    await db
      .update(hotspotUsers)
      .set({
        isActive: true,
        expiresAt,
        updatedAt: new Date()
      })
      .where(eq(hotspotUsers.id, id));
  }

  async deactivateUser(id: string): Promise<void> {
    await db
      .update(hotspotUsers)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(hotspotUsers.id, id));
  }

  // M-Pesa transaction operations
  async getAllTransactions(): Promise<MpesaTransaction[]> {
    return await db.select().from(mpesaTransactions).orderBy(desc(mpesaTransactions.createdAt));
  }

  async getRecentTransactions(limit = 10): Promise<MpesaTransaction[]> {
    return await db
      .select()
      .from(mpesaTransactions)
      .orderBy(desc(mpesaTransactions.createdAt))
      .limit(limit);
  }

  async getTransaction(id: string): Promise<MpesaTransaction | undefined> {
    const [transaction] = await db.select().from(mpesaTransactions).where(eq(mpesaTransactions.id, id));
    return transaction || undefined;
  }

  async getTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<MpesaTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.checkoutRequestId, checkoutRequestId));
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertMpesaTransaction): Promise<MpesaTransaction> {
    const [newTransaction] = await db.insert(mpesaTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertMpesaTransaction>): Promise<MpesaTransaction | undefined> {
    const [updatedTransaction] = await db
      .update(mpesaTransactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(mpesaTransactions.id, id))
      .returning();
    return updatedTransaction || undefined;
  }

  // User session operations
  async createSession(session: InsertUserSession): Promise<UserSession> {
    const [newSession] = await db.insert(userSessions).values(session).returning();
    return newSession;
  }

  async getActiveSessionsByUser(userId: string): Promise<UserSession[]> {
    return await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true)
      ));
  }

  async endSession(id: string): Promise<void> {
    await db
      .update(userSessions)
      .set({
        endTime: new Date(),
        isActive: false
      })
      .where(eq(userSessions.id, id));
  }

  // Vouchers
  async createVouchers(voucherData: InsertVoucher[]): Promise<Voucher[]> {
    return await db.insert(vouchers).values(voucherData).returning();
  }

  async getVoucherByCode(code: string): Promise<Voucher | null> {
    const [voucher] = await db
      .select()
      .from(vouchers)
      .where(eq(vouchers.code, code));
    return voucher || null;
  }

  async getAllVouchers(): Promise<(Voucher & { plan: SubscriptionPlan })[]> {
    return await db
      .select({
        id: vouchers.id,
        code: vouchers.code,
        planId: vouchers.planId,
        isUsed: vouchers.isUsed,
        usedBy: vouchers.usedBy,
        usedAt: vouchers.usedAt,
        expiresAt: vouchers.expiresAt,
        createdBy: vouchers.createdBy,
        createdAt: vouchers.createdAt,
        updatedAt: vouchers.updatedAt,
        plan: subscriptionPlans,
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .orderBy(desc(vouchers.createdAt));
  }

  async redeemVoucher(code: string, userId: string): Promise<boolean> {
    const result = await db
      .update(vouchers)
      .set({
        isUsed: true,
        usedBy: userId,
        usedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(and(eq(vouchers.code, code), eq(vouchers.isUsed, false)))
      .returning();

    return result.length > 0;
  }

  // Voucher statistics
  async getVoucherStats(): Promise<{
    total: number;
    used: number;
    unused: number;
    expired: number;
    active: number;
  }> {
    // Use direct database queries for more accurate counts
    const now = new Date();
    
    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(vouchers);

    // Get used count
    const [usedResult] = await db
      .select({ count: count() })
      .from(vouchers)
      .where(eq(vouchers.isUsed, true));

    // Get expired count (not used and past expiry)
    const [expiredResult] = await db
      .select({ count: count() })
      .from(vouchers)
      .where(and(
        eq(vouchers.isUsed, false),
        isNotNull(vouchers.expiresAt),
        sql`${vouchers.expiresAt} <= ${now}`
      ));

    // Get active count (not used and not expired)
    const [activeResult] = await db
      .select({ count: count() })
      .from(vouchers)
      .where(and(
        eq(vouchers.isUsed, false),
        or(
          isNull(vouchers.expiresAt),
          sql`${vouchers.expiresAt} > ${now}`
        )
      ));

    const total = totalResult.count;
    const used = usedResult.count;
    const expired = expiredResult.count;
    const active = activeResult.count;
    const unused = total - used; // Total unused (including expired)

    return {
      total,
      used,
      unused,
      expired,
      active,
    };
  }

  // Settings management
  async getSettings(): Promise<any> {
    const settingsRows = await db.select().from(schema.settings);

    // Convert key-value pairs to settings object
    const settingsObj: any = {
      companyName: "HotSpot Connect",
      supportPhone: "+254723534293",
      welcomeMessage: "Welcome to Premium Internet. Choose a subscription plan to enjoy high-speed internet access.",
      businessName: "HotSpot Connect",
      autoLogout: false,
    };

    settingsRows.forEach(row => {
      try {
        // Try to parse as JSON first, fallback to string
        settingsObj[row.key] = JSON.parse(row.value);
      } catch {
        settingsObj[row.key] = row.value;
      }
    });

    return settingsObj;
  }

  async updateSettings(settingsData: any): Promise<any> {
    // Update or insert each setting
    for (const [key, value] of Object.entries(settingsData)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Try to update first
      const updated = await db.update(schema.settings)
        .set({
          value: stringValue,
          updatedAt: new Date()
        })
        .where(eq(schema.settings.key, key))
        .returning();

      // If no rows were updated, insert new setting
      if (updated.length === 0) {
        await db.insert(schema.settings)
          .values({
            key,
            value: stringValue
          });
      }
    }

    return await this.getSettings();
  }

  // Statistics
  async getDashboardStats(): Promise<{
    activeUsers: number;
    totalRevenue: string;
    connectedRouters: number;
    todaySales: string;
    todayTransactions: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active users count
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(hotspotUsers)
      .where(and(
        eq(hotspotUsers.isActive, true),
        gte(hotspotUsers.expiresAt, new Date())
      ));

    // Get total revenue from M-Pesa transactions
    const [totalMpesaRevenueResult] = await db
      .select({ total: sum(mpesaTransactions.amount) })
      .from(mpesaTransactions)
      .where(eq(mpesaTransactions.status, "completed"));

    // Get total revenue from voucher redemptions
    const [totalVoucherRevenueResult] = await db
      .select({ total: sql<string>`SUM(${subscriptionPlans.price})` })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy)
      ));

    // Get connected routers count
    const [routersResult] = await db
      .select({ count: count() })
      .from(mikrotikRouters)
      .where(eq(mikrotikRouters.isActive, true));

    // Get today's M-Pesa sales
    const [todayMpesaSalesResult] = await db
      .select({
        total: sum(mpesaTransactions.amount),
        count: count()
      })
      .from(mpesaTransactions)
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, today)
      ));

    // Get today's voucher sales
    const [todayVoucherSalesResult] = await db
      .select({
        total: sql<string>`SUM(${subscriptionPlans.price})`,
        count: count()
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, today)
      ));

    // Calculate combined totals
    const totalMpesaRevenue = parseFloat(totalMpesaRevenueResult.total || "0");
    const totalVoucherRevenue = parseFloat(totalVoucherRevenueResult.total || "0");
    const todayMpesaSales = parseFloat(todayMpesaSalesResult.total || "0");
    const todayVoucherSales = parseFloat(todayVoucherSalesResult.total || "0");

    const totalRevenue = totalMpesaRevenue + totalVoucherRevenue;
    const todaySales = todayMpesaSales + todayVoucherSales;
    const todayTransactions = (todayMpesaSalesResult.count || 0) + (todayVoucherSalesResult.count || 0);

    return {
      activeUsers: activeUsersResult.count,
      totalRevenue: totalRevenue.toString(),
      connectedRouters: routersResult.count,
      todaySales: todaySales.toString(),
      todayTransactions: todayTransactions,
    };
  }

  async getRouterSpecificStats(routerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Get today's M-Pesa sales for specific router
    const [todayMpesaSalesResult] = await db
      .select({
        total: sum(mpesaTransactions.amount)
      })
      .from(mpesaTransactions)
      .innerJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, today),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get today's voucher sales for specific router
    const [todayVoucherSalesResult] = await db
      .select({
        total: sql<string>`SUM(${subscriptionPlans.price})`
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, today),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get active users for specific router
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(hotspotUsers)
      .where(and(
        eq(hotspotUsers.routerId, routerId),
        eq(hotspotUsers.isActive, true),
        gte(hotspotUsers.expiresAt, new Date())
      ));

    // Get total users for specific router
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(hotspotUsers)
      .where(eq(hotspotUsers.routerId, routerId));

    // Get monthly M-Pesa revenue for specific router
    const [monthlyMpesaRevenueResult] = await db
      .select({
        total: sum(mpesaTransactions.amount)
      })
      .from(mpesaTransactions)
      .innerJoin(hotspotUsers, eq(mpesaTransactions.userId, hotspotUsers.id))
      .where(and(
        eq(mpesaTransactions.status, "completed"),
        gte(mpesaTransactions.transactionDate, currentMonth),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Get monthly voucher revenue for specific router
    const [monthlyVoucherRevenueResult] = await db
      .select({
        total: sql<string>`SUM(${subscriptionPlans.price})`
      })
      .from(vouchers)
      .leftJoin(subscriptionPlans, eq(vouchers.planId, subscriptionPlans.id))
      .leftJoin(hotspotUsers, eq(vouchers.usedBy, hotspotUsers.id))
      .where(and(
        eq(vouchers.isUsed, true),
        isNotNull(vouchers.usedBy),
        gte(vouchers.usedAt, currentMonth),
        eq(hotspotUsers.routerId, routerId)
      ));

    // Calculate combined totals
    const todayMpesaSales = parseFloat(todayMpesaSalesResult.total || "0");
    const todayVoucherSales = parseFloat(todayVoucherSalesResult.total || "0");
    const monthlyMpesaRevenue = parseFloat(monthlyMpesaRevenueResult.total || "0");
    const monthlyVoucherRevenue = parseFloat(monthlyVoucherRevenueResult.total || "0");

    const todaySales = todayMpesaSales + todayVoucherSales;
    const monthlyRevenue = monthlyMpesaRevenue + monthlyVoucherRevenue;

    return {
      todaySales: todaySales.toString(),
      activeUsers: activeUsersResult.count,
      totalUsers: totalUsersResult.count,
      monthlyRevenue: monthlyRevenue.toString(),
    };
  }
}

export const storage = new DatabaseStorage();