import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Super Admins - Top level administrators
export const superAdmins = pgTable("super_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Providers - Service providers who manage their own routers and services
export const providers = pgTable("providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  subdomain: text("subdomain").unique(), // For captive portal subdomain routing
  address: text("address"),
  kraPin: text("kra_pin"),
  businessLicense: text("business_license"),
  status: text("status").notNull().default("active"), // active, suspended, inactive
  paymentGatewayId: varchar("payment_gateway_id"),
  captivePortalSettings: jsonb("captive_portal_settings"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Provider Admins - Admin users for each provider
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  providerId: varchar("provider_id").references(() => providers.id),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Payment Gateways - Available payment methods
export const paymentGateways = pgTable("payment_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // mpesa, airtel_money, bank
  provider: text("provider").notNull(), // safaricom, airtel, kcb, equity, etc
  isActive: boolean("is_active").notNull().default(true),
  hasAutoApi: boolean("has_auto_api").notNull().default(false), // Auto API configuration available
  supportsCustomApi: boolean("supports_custom_api").notNull().default(true), // Custom API allowed
  configuration: jsonb("configuration"), // API keys, endpoints, etc
  sandboxConfig: jsonb("sandbox_config"), // Sandbox API configuration
  productionConfig: jsonb("production_config"), // Production API configuration
  requiredFields: jsonb("required_fields"), // Required fields for configuration
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Provider Payment Gateways - Link providers to their payment methods
export const providerPaymentGateways = pgTable("provider_payment_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => providers.id),
  paymentGatewayId: varchar("payment_gateway_id").notNull().references(() => paymentGateways.id),
  routerId: varchar("router_id").references(() => mikrotikRouters.id), // Optional router assignment
  configuration: jsonb("configuration"), // Encrypted credentials and settings
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationHours: integer("duration_hours").notNull(),
  speedMbps: integer("speed_mbps").notNull(),
  dataLimitGB: integer("data_limit_gb"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const mikrotikRouters = pgTable("mikrotik_routers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(8728),
  username: text("username").notNull(),
  password: text("password").notNull(),
  routerosVersion: text("routeros_version").notNull().default("7.x"), // 6.x, 7.x
  connectionType: text("connection_type").notNull().default("direct"), // direct, ovpn_client
  ovpnServerHost: text("ovpn_server_host"),
  ovpnServerPort: integer("ovpn_server_port").default(1194),
  ovpnUsername: text("ovpn_username"),
  ovpnPassword: text("ovpn_password"),
  ovpnCertificate: text("ovpn_certificate"),
  ovpnPrivateKey: text("ovpn_private_key"),
  ovpnCaFile: text("ovpn_ca_file"),
  ovpnTunnelIp: text("ovpn_tunnel_ip"),
  providerId: varchar("provider_id").references(() => providers.id),
  location: text("location"), // Router physical location
  status: text("status").notNull().default("active"), // active, suspended, inactive
  isOnline: boolean("is_online").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const hotspotUsers = pgTable("hotspot_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  macAddress: text("mac_address").notNull().unique(),
  phoneNumber: text("phone_number"),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  routerId: varchar("router_id").references(() => mikrotikRouters.id),
  username: text("username"),
  password: text("password"),
  isActive: boolean("is_active").notNull().default(false),
  expiresAt: timestamp("expires_at"),
  bytesUploaded: integer("bytes_uploaded").default(0),
  bytesDownloaded: integer("bytes_downloaded").default(0),
  sessionTime: integer("session_time").default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const mpesaTransactions = pgTable("mpesa_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkoutRequestId: text("checkout_request_id").unique(),
  merchantRequestId: text("merchant_request_id"),
  phoneNumber: text("phone_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  userId: varchar("user_id").references(() => hotspotUsers.id),
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  transactionDate: timestamp("transaction_date"),
  callbackData: jsonb("callback_data"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => hotspotUsers.id),
  routerId: varchar("router_id").references(() => mikrotikRouters.id),
  sessionId: text("session_id"),
  startTime: timestamp("start_time").notNull().default(sql`now()`),
  endTime: timestamp("end_time"),
  bytesUploaded: integer("bytes_uploaded").default(0),
  bytesDownloaded: integer("bytes_downloaded").default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const vouchers = pgTable("vouchers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  usedBy: varchar("used_by").references(() => hotspotUsers.id),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => admins.id).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Relations
export const providersRelations = relations(providers, ({ many, one }) => ({
  admins: many(admins),
  routers: many(mikrotikRouters),
  paymentGateways: many(providerPaymentGateways),
  paymentGateway: one(paymentGateways, {
    fields: [providers.paymentGatewayId],
    references: [paymentGateways.id],
  }),
}));

export const adminsRelations = relations(admins, ({ one, many }) => ({
  provider: one(providers, {
    fields: [admins.providerId],
    references: [providers.id],
  }),
  vouchers: many(vouchers),
}));

export const paymentGatewaysRelations = relations(paymentGateways, ({ many }) => ({
  providers: many(providers),
  providerGateways: many(providerPaymentGateways),
}));

export const providerPaymentGatewaysRelations = relations(providerPaymentGateways, ({ one }) => ({
  provider: one(providers, {
    fields: [providerPaymentGateways.providerId],
    references: [providers.id],
  }),
  gateway: one(paymentGateways, {
    fields: [providerPaymentGateways.paymentGatewayId],
    references: [paymentGateways.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  users: many(hotspotUsers),
  transactions: many(mpesaTransactions),
  vouchers: many(vouchers),
}));

export const mikrotikRoutersRelations = relations(mikrotikRouters, ({ one, many }) => ({
  provider: one(providers, {
    fields: [mikrotikRouters.providerId],
    references: [providers.id],
  }),
  users: many(hotspotUsers),
  sessions: many(userSessions),
}));

export const hotspotUsersRelations = relations(hotspotUsers, ({ one, many }) => ({
  plan: one(subscriptionPlans, {
    fields: [hotspotUsers.planId],
    references: [subscriptionPlans.id],
  }),
  router: one(mikrotikRouters, {
    fields: [hotspotUsers.routerId],
    references: [mikrotikRouters.id],
  }),
  transactions: many(mpesaTransactions),
  sessions: many(userSessions),
  redeemedVouchers: many(vouchers),
}));

export const mpesaTransactionsRelations = relations(mpesaTransactions, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [mpesaTransactions.planId],
    references: [subscriptionPlans.id],
  }),
  user: one(hotspotUsers, {
    fields: [mpesaTransactions.userId],
    references: [hotspotUsers.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(hotspotUsers, {
    fields: [userSessions.userId],
    references: [hotspotUsers.id],
  }),
  router: one(mikrotikRouters, {
    fields: [userSessions.routerId],
    references: [mikrotikRouters.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [vouchers.planId],
    references: [subscriptionPlans.id],
  }),
  usedByUser: one(hotspotUsers, {
    fields: [vouchers.usedBy],
    references: [hotspotUsers.id],
  }),
  createdByAdmin: one(admins, {
    fields: [vouchers.createdBy],
    references: [admins.id],
  }),
}));

// Insert schemas
export const insertSuperAdminSchema = createInsertSchema(superAdmins).omit({
  id: true,
  createdAt: true,
});

export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({
  id: true,
  createdAt: true,
});

export const insertProviderPaymentGatewaySchema = createInsertSchema(providerPaymentGateways).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMikrotikRouterSchema = createInsertSchema(mikrotikRouters).omit({
  id: true,
  lastSeen: true,
  createdAt: true,
});

export const insertHotspotUserSchema = createInsertSchema(hotspotUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMpesaTransactionSchema = createInsertSchema(mpesaTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
});

export const insertVoucherSchema = createInsertSchema(vouchers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type SuperAdmin = typeof superAdmins.$inferSelect;
export type InsertSuperAdmin = z.infer<typeof insertSuperAdminSchema>;

export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;

export type ProviderPaymentGateway = typeof providerPaymentGateways.$inferSelect;
export type InsertProviderPaymentGateway = typeof providerPaymentGateways.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type MikrotikRouter = typeof mikrotikRouters.$inferSelect;
export type InsertMikrotikRouter = z.infer<typeof insertMikrotikRouterSchema>;

export type HotspotUser = typeof hotspotUsers.$inferSelect;
export type InsertHotspotUser = z.infer<typeof insertHotspotUserSchema>;

export type MpesaTransaction = typeof mpesaTransactions.$inferSelect;
export type InsertMpesaTransaction = z.infer<typeof insertMpesaTransactionSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Additional validation schemas
export const mpesaPaymentSchema = z.object({
  phoneNumber: z.string().regex(/^254\d{9}$/, "Invalid Kenyan phone number format"),
  planId: z.string().min(1, "Plan ID is required"),
  macAddress: z.string().min(1, "MAC address is required"),
  routerId: z.string().optional(), // Optional router ID for router-specific payment gateways
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type MpesaPaymentRequest = z.infer<typeof mpesaPaymentSchema>;
export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;

// Voucher validation schemas
export const voucherGenerateSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  quantity: z.number().min(1, "Quantity must be at least 1").max(100, "Maximum 100 vouchers at once"),
  expiresAt: z.string().optional(),
});

export const voucherRedeemSchema = z.object({
  voucherCode: z.string().min(1, "Voucher code is required"),
  macAddress: z.string().min(1, "MAC address is required"),
});

export type VoucherGenerateRequest = z.infer<typeof voucherGenerateSchema>;
export type VoucherRedeemRequest = z.infer<typeof voucherRedeemSchema>;

// Super Admin validation schemas
export const superAdminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const providerCreateSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().optional(),
  kraPin: z.string().optional(),
  businessLicense: z.string().optional(),
});

export const providerCreateWithAdminSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().optional(),
  kraPin: z.string().optional(),
  businessLicense: z.string().optional(),
  adminCredentials: z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Admin name is required"),
    email: z.string().email("Invalid admin email address"),
  }).optional(),
});

export const routerAssignSchema = z.object({
  routerId: z.string().min(1, "Router ID is required"),
  providerId: z.string().min(1, "Provider ID is required"),
  location: z.string().optional(),
});

export const paymentGatewayConfigSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required"),
  gatewayId: z.string().min(1, "Gateway ID is required"),
  routerId: z.string().optional(), // Optional router assignment
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  useAutoApi: z.boolean().default(false), // Use system's auto API
  accountNumber: z.string().min(1, "Account number is required"), // Required payment receiving account
  configuration: z.object({
    // M-Pesa configs
    consumerKey: z.string().optional(),
    consumerSecret: z.string().optional(),
    businessShortCode: z.string().optional(),
    passkey: z.string().optional(),
    // Bank API configs
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    bankCode: z.string().optional(),
    merchantId: z.string().optional(),
    // Airtel Money configs
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    merchantCode: z.string().optional(),
  }),
});

export const captivePortalSettingsSchema = z.object({
  providerId: z.string().min(1, "Provider ID is required"),
  settings: z.object({
    companyName: z.string().min(1, "Company name is required"),
    welcomeMessage: z.string().optional(),
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontFamily: z.string().optional(),
    termsUrl: z.string().url().optional(),
    privacyUrl: z.string().url().optional(),
    supportPhone: z.string().optional(),
    supportEmail: z.string().email().optional(),
  }),
});

export type SuperAdminLoginRequest = z.infer<typeof superAdminLoginSchema>;
export type ProviderCreateRequest = z.infer<typeof providerCreateSchema>;
export type RouterAssignRequest = z.infer<typeof routerAssignSchema>;
export type PaymentGatewayConfigRequest = z.infer<typeof paymentGatewayConfigSchema>;
export type CaptivePortalSettingsRequest = z.infer<typeof captivePortalSettingsSchema>;