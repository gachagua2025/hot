import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mpesaService } from "./services/mpesa";
import { mikrotikService } from "./services/mikrotik";
import { routerDiscoveryService } from "./services/router-discovery";
import { ovpnConfigService } from "./services/ovpn-config";
import { payoutService } from "./services/payout";
import {
  mpesaPaymentSchema,
  adminLoginSchema,
  superAdminLoginSchema,
  providerCreateSchema,
  routerAssignSchema,
  paymentGatewayConfigSchema,
  captivePortalSettingsSchema,
  insertSubscriptionPlanSchema,
  insertMikrotikRouterSchema,
  insertPaymentGatewaySchema,
  voucherGenerateSchema,
  voucherRedeemSchema,
  type MpesaPaymentRequest,
  type AdminLoginRequest,
  type SuperAdminLoginRequest,
  type ProviderCreateRequest,
  type RouterAssignRequest,
  type PaymentGatewayConfigRequest,
  type CaptivePortalSettingsRequest,
  type VoucherGenerateRequest,
  type VoucherRedeemRequest,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Helper function to process automatic payout to provider
async function processAutomaticPayout(routerId: string, transaction: any, paymentResult: any) {
  try {
    console.log("💸 Starting automatic payout process...");

    // Get router details to find provider
    const routers = await storage.getAllRouters();
    const router = routers.find((r: any) => r.id === routerId);
    if (!router || !router.providerId) {
      console.log("ℹ️ No provider associated with this router, skipping payout");
      return;
    }

    console.log(`🏢 Router belongs to provider: ${router.providerId}`);

    // Get provider payment gateway configuration
    const providerPaymentGateways = await storage.getProviderPaymentGateways(router.providerId);
    if (providerPaymentGateways.length === 0) {
      console.log("ℹ️ No payment gateway configured for provider, skipping payout");
      return;
    }

    // Use the first active payment gateway
    const activeGateway = providerPaymentGateways.find(g => g.isActive);
    if (!activeGateway) {
      console.log("ℹ️ No active payment gateway found for provider, skipping payout");
      return;
    }

    // Get the payment gateway details
    const paymentGateway = await storage.getPaymentGateway(activeGateway.paymentGatewayId);
    if (!paymentGateway) {
      console.log("❌ Payment gateway details not found");
      return;
    }

    console.log(`💳 Using payment gateway: ${paymentGateway.name} (${paymentGateway.type})`);

    // Load external gateway data for paybill and account details
    let gatewayConfig: any = activeGateway.configuration || {};

    try {
      const banksData = fs.readFileSync(path.join(process.cwd(), 'banks.json'), 'utf8');
      const mobileMoneyData = fs.readFileSync(path.join(process.cwd(), 'mobile-money.json'), 'utf8');

      const banks = JSON.parse(banksData);
      const mobileMoneyProviders = JSON.parse(mobileMoneyData);

      // Find external data to get paybill details
      const externalData = [...banks, ...mobileMoneyProviders].find((item: any) => 
        item.name.toLowerCase().includes(paymentGateway.name.toLowerCase().split(' ')[0])
      );

      if (externalData) {
        console.log(`📋 Using paybill details from external data: ${externalData.paybill}`);
        gatewayConfig = {
          ...gatewayConfig,
          paybill: externalData.paybill,
          transactionDesc: externalData.transactionDesc
        };
      }
    } catch (error) {
      console.log("⚠️ Could not load external gateway data, using stored config");
    }

    // Prepare payout request
    const payoutRequest = {
      providerId: router.providerId,
      amount: transaction.amount,
      transactionReference: paymentResult.mpesaReceiptNumber || transaction.id,
      paymentGateway: {
        type: paymentGateway.type,
        paybill: gatewayConfig.paybill || paymentGateway.type,
        accountNumber: gatewayConfig.accountNumber || activeGateway.configuration?.accountNumber || '',
        transactionDesc: gatewayConfig.transactionDesc || `Payout for transaction ${transaction.id}`
      }
    };

    console.log("💰 Initiating automatic payout:", {
      provider: router.providerId,
      amount: transaction.amount,
      gateway: paymentGateway.name,
      type: paymentGateway.type
    });

    // Process the payout
    const payoutSuccess = await payoutService.processAutomaticPayout(payoutRequest);

    if (payoutSuccess) {
      console.log("✅ Automatic payout initiated successfully");

      // Create payout record in database
      await storage.createTransaction({
        checkoutRequestId: `payout-${Date.now()}`,
        merchantRequestId: `payout-${router.providerId}`,
        phoneNumber: '254700000000', // Placeholder for payout
        amount: payoutService.calculateProviderShare(transaction.amount).toString(),
        planId: null,
        userId: null,
        status: "completed",
        mpesaReceiptNumber: `PAYOUT-${paymentResult.mpesaReceiptNumber}`,
        transactionDate: new Date(),
        callbackData: { type: 'automatic_payout', providerId: router.providerId }
      });

    } else {
      console.log("❌ Automatic payout failed");
    }

  } catch (error) {
    console.error("💥 Error in automatic payout:", error);
    throw error;
  }
}

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      subdomain?: string;
      providerId?: string;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Subdomain detection middleware
  app.use((req, res, next) => {
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'mkashop') {
        req.subdomain = subdomain;
      }
    }
    next();
  });

  // Public routes - no authentication required

  // Get active subscription plans for captive portal
  app.get("/api/plans", async (req, res) => {
    try {
      let plans = await storage.getActivePlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Helper function to get available payment gateways for a router
  async function getRouterPaymentGateways(routerId: string | null = null) {
    try {
      if (routerId) {
        // Get router details to find provider
        const routers = await storage.getAllRouters();
        const router = routers.find((r: any) => r.id === routerId);

        if (router && router.providerId) {
          const providerGateways = await storage.getProviderPaymentGateways(router.providerId);

          // Filter gateways - router-specific first, then general ones
          const routerSpecificGateways = providerGateways.filter(g => g.routerId === routerId && g.isActive);
          const generalGateways = providerGateways.filter(g => !g.routerId && g.isActive);

          // Prefer router-specific gateways
          return routerSpecificGateways.length > 0 ? routerSpecificGateways : generalGateways;
        }
      }

      // Fallback to default system payment gateway
      return [];
    } catch (error) {
      console.error("Error getting router payment gateways:", error);
      return [];
    }
  }

  // Initiate M-Pesa payment
  app.post("/api/payment/initiate", async (req, res) => {
    try {
      const validatedData = mpesaPaymentSchema.parse(req.body);
      const { phoneNumber, planId, macAddress, routerId } = validatedData;

      // Get the subscription plan
      const plan = await storage.getPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Check available payment gateways for this router
      const availableGateways = await getRouterPaymentGateways(routerId);
      if (routerId && availableGateways.length === 0) {
        return res.status(400).json({ 
          message: "No payment gateway configured for this router. Please contact administrator." 
        });
      }

      // Check if user already exists
      let user = await storage.getUserByMacAddress(macAddress);
      if (!user) {
        // Create new user with router assignment
        user = await storage.createUser({
          macAddress,
          phoneNumber,
          planId,
          routerId: routerId || null, // Assign user to specific router if provided
          username: `user_${macAddress.replace(/:/g, "")}`,
          password: randomUUID().slice(0, 8),
        });
      } else {
        // Update existing user with router assignment if not set
        if (routerId && !user.routerId) {
          const updatedUser = await storage.updateUser(user.id, { routerId });
          if (updatedUser) {
            user = updatedUser;
          }
        }
      }

      // Format phone number for M-Pesa
      const formattedPhone = mpesaService.formatPhoneNumber(phoneNumber);

      // Initiate STK push
      const stkResponse = await mpesaService.initiateStkPush(
        formattedPhone,
        parseFloat(plan.price),
        user.id
      );

      // Create transaction record
      const transaction = await storage.createTransaction({
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        phoneNumber: formattedPhone,
        amount: plan.price,
        planId: plan.id,
        userId: user.id,
        status: "pending",
      });

      res.json({
        success: true,
        message: "STK push initiated successfully",
        checkoutRequestId: stkResponse.CheckoutRequestID,
        transactionId: transaction.id,
      });
    } catch (error) {
      console.error("Payment initiation error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Payment initiation failed" 
      });
    }
  });

  // M-Pesa callback endpoint
  app.post("/api/payment/callback", async (req, res) => {
    try {
      const callbackData = req.body;
      console.log("🔔 M-Pesa callback received from:", req.ip);
      console.log("🔔 Headers:", JSON.stringify(req.headers, null, 2));
      console.log("🔔 Callback data:", JSON.stringify(callbackData, null, 2));

      // Validate callback structure
      if (!callbackData?.Body?.stkCallback) {
        console.error("❌ Invalid callback structure:", callbackData);
        return res.status(400).json({ message: "Invalid callback structure" });
      }

      const { stkCallback } = callbackData.Body;
      const checkoutRequestId = stkCallback.CheckoutRequestID;

      if (!checkoutRequestId) {
        console.error("❌ Missing CheckoutRequestID in callback");
        return res.status(400).json({ message: "Missing CheckoutRequestID" });
      }

      console.log(`🔍 Looking for transaction with CheckoutRequestID: ${checkoutRequestId}`);
      console.log(`🔍 All active transactions in database:`);

      // Debug: Show all recent transactions
      const allTransactions = await storage.getAllTransactions();
      const recentTransactions = allTransactions.slice(0, 5);
      recentTransactions.forEach(t => {
        console.log(`  - ID: ${t.id}, CheckoutRequestID: ${t.checkoutRequestId}, Status: ${t.status}`);
      });

      // Find transaction by checkout request ID
      let transaction = await storage.getTransactionByCheckoutRequestId(checkoutRequestId);

      if (!transaction) {
        console.error(`❌ Transaction not found for CheckoutRequestID: ${checkoutRequestId}`);
        console.log("💡 This might be a test callback or the transaction was not created properly");
        // Still respond with success to avoid M-Pesa retries
        return res.json({ 
          success: true, 
          message: "Callback received but transaction not found" 
        });
      }

      console.log(`✅ Transaction found: ${transaction.id} (Status: ${transaction.status})`);

      // Parse callback data
      const paymentResult = mpesaService.parseCallbackData(callbackData);
      console.log("📊 Payment result:", paymentResult);

      if (paymentResult.success) {
        console.log("💳 Payment successful - updating transaction status");

        // Update transaction status
        await storage.updateTransaction(transaction.id, {
          status: "completed",
          mpesaReceiptNumber: paymentResult.mpesaReceiptNumber,
          transactionDate: paymentResult.transactionDate,
          callbackData: callbackData,
        });

        console.log(`✅ Transaction ${transaction.id} status updated to completed`);
        console.log(`💰 Receipt Number: ${paymentResult.mpesaReceiptNumber}`);

        // Get plan details to calculate expiry
        const plan = await storage.getPlan(transaction.planId!);
        if (plan && transaction.userId) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + plan.durationHours);

          // Activate user
          await storage.activateUser(transaction.userId, expiresAt);
          console.log(`🌐 User ${transaction.userId} activated for internet access until ${expiresAt}`);

          // Create hotspot user on MikroTik router
          const user = await storage.getUser(transaction.userId);
          if (user && user.routerId) {
            try {
              await mikrotikService.createHotspotUser(user.routerId, {
                username: user.username!,
                password: user.password!,
                profile: `profile_${plan.speedMbps}M`,
                macAddress: user.macAddress,
              });

              await mikrotikService.enableHotspotUser(user.routerId, user.username!);
              console.log("🔗 MikroTik hotspot user created and enabled");
            } catch (mikrotikError) {
              console.error("⚠️ MikroTik operation failed:", mikrotikError);
              // Don't fail the whole transaction if MikroTik fails
            }

            // Process automatic payout to provider
            try {
              await processAutomaticPayout(user.routerId, transaction, paymentResult);
            } catch (payoutError) {
              console.error("⚠️ Automatic payout failed:", payoutError);
              // Don't fail the transaction if payout fails
            }
          } else {
            console.log("ℹ️ No MikroTik router configured for this user");
          }
        }
      } else {
        console.log(`❌ Payment failed: ${paymentResult.error}`);

        // Update transaction status to failed
        await storage.updateTransaction(transaction.id, {
          status: "failed",
          callbackData: callbackData,
        });

        console.log(`✅ Transaction ${transaction.id} status updated to failed`);
      }

      // Always respond with success to M-Pesa
      res.json({ 
        ResponseCode: "00000000", 
        ResponseDesc: "success" 
      });
      console.log("📤 Callback response sent to M-Pesa");

    } catch (error) {
      console.error("❌ Callback processing error:", error);
      console.error("Error details:", error);

      // Still respond with success to avoid M-Pesa retries
      res.json({ 
        ResponseCode: "00000000", 
        ResponseDesc: "success" 
      });
    }
  });

  // Simulate successful payment for testing
  app.post("/api/payment/test-success/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      console.log("🧪 Simulating successful payment for transaction:", transactionId);

      // Update transaction to completed status
      await storage.updateTransaction(transaction.id, {
        status: "completed",
        mpesaReceiptNumber: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        transactionDate: new Date(),
        callbackData: { simulated: true, type: 'test_success' }
      });

      // Get plan details and activate user
      const plan = await storage.getPlan(transaction.planId!);
      if (plan && transaction.userId) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + plan.durationHours);
        await storage.activateUser(transaction.userId, expiresAt);
        console.log(`🌐 User ${transaction.userId} activated for internet access until ${expiresAt}`);
      }

      res.json({
        success: true,
        message: "Payment simulation successful",
        status: "completed",
        transactionId: transaction.id
      });

    } catch (error) {
      console.error("Test success simulation error:", error);
      res.status(500).json({ message: "Test simulation failed" });
    }
  });

  // Test callback endpoint for debugging
  app.post("/api/payment/test-callback/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getTransaction(transactionId);

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Simulate a successful M-Pesa callback
      const simulatedCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: transaction.merchantRequestId,
            CheckoutRequestID: transaction.checkoutRequestId,
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            CallbackMetadata: {
              Item: [
                { Name: "Amount", Value: parseFloat(transaction.amount) },
                { Name: "MpesaReceiptNumber", Value: `TEST${Math.random().toString(36).substring(2, 8).toUpperCase()}` },
                { Name: "TransactionDate", Value: parseInt(new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14)) },
                { Name: "PhoneNumber", Value: transaction.phoneNumber }
              ]
            }
          }
        }
      };

      // Process the callback
      console.log("🧪 Processing test callback for transaction:", transactionId);
      const callbackResponse = await fetch(`${req.protocol}://${req.get('host')}/api/payment/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulatedCallback),
      });

      const result = await callbackResponse.json();

      res.json({
        success: true,
        message: "Test callback processed",
        callbackResponse: result,
        simulatedCallback,
      });

    } catch (error) {
      console.error("Test callback error:", error);
      res.status(500).json({ message: "Test callback failed" });
    }
  });

  // Redeem voucher
  app.post("/api/voucher/redeem", async (req, res) => {
    try {
      const validatedData = voucherRedeemSchema.parse(req.body);
      const { voucherCode, macAddress } = validatedData;

      // Get voucher details
      const voucher = await storage.getVoucherByCode(voucherCode);
      if (!voucher) {
        return res.status(404).json({ message: "Invalid voucher code" });
      }

      if (voucher.isUsed) {
        return res.status(400).json({ message: "Voucher has already been used" });
      }

      if (voucher.expiresAt && new Date() > voucher.expiresAt) {
        return res.status(400).json({ message: "Voucher has expired" });
      }

      // Get the subscription plan
      const plan = await storage.getPlan(voucher.planId);
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }

      // Check if user already exists
      let user = await storage.getUserByMacAddress(macAddress);
      if (!user) {
        // Create new user
        user = await storage.createUser({
          macAddress,
          planId: plan.id,
          username: `user_${macAddress.replace(/:/g, "")}`,
          password: randomUUID().slice(0, 8),
        });
      }

      // Redeem voucher
      const redeemed = await storage.redeemVoucher(voucherCode, user.id);
      if (!redeemed) {
        return res.status(400).json({ message: "Failed to redeem voucher" });
      }

      // Activate user
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + plan.durationHours);
      await storage.activateUser(user.id, expiresAt);

      // Create hotspot user on MikroTik router if configured
      if (user.routerId) {
        try {
          await mikrotikService.createHotspotUser(user.routerId, {
            username: user.username!,
            password: user.password!,
            profile: `profile_${plan.speedMbps}M`,
            macAddress: user.macAddress,
          });

          await mikrotikService.enableHotspotUser(user.routerId, user.username!);
          console.log("🔗 MikroTik hotspot user created and enabled via voucher");
        } catch (mikrotikError) {
          console.error("⚠️ MikroTik operation failed:", mikrotikError);
        }
      }

      res.json({
        success: true,
        message: "Voucher redeemed successfully",
        plan: plan,
        expiresAt: expiresAt,
      });
    } catch (error) {
      console.error("Voucher redemption error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Voucher redemption failed" 
      });
    }
  });

  // Check payment status
  app.get("/api/payment/status/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getTransaction(transactionId);

      if (!transaction) {
        console.log("❌ Transaction not found:", transactionId);
        return res.status(404).json({ message: "Transaction not found" });
      }

      const statusResponse = {
        status: transaction.status,
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        createdAt: transaction.createdAt,
      };

      // Only log when status is not pending to reduce noise
      if (transaction.status !== 'pending') {
        console.log(`📊 Status check for ${transactionId}: ${transaction.status}`);
      }

      res.json(statusResponse);
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ message: "Failed to check payment status" });
    }
  });

  // Super Admin authentication
  app.post("/api/superadmin/login", async (req, res) => {
    try {
      const { username, password } = superAdminLoginSchema.parse(req.body);

      const superAdmin = await storage.getSuperAdminByUsername(username);
      if (!superAdmin) {
        console.log("Super admin not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Checking password for super admin:", username);
      console.log("Stored password hash:", superAdmin.password);
      console.log("Provided password:", password);

      // Check if password is already hashed or plain text
      let isValidPassword = false;
      if (superAdmin.password.startsWith('$2')) {
        // Password is hashed, use bcrypt
        isValidPassword = await bcrypt.compare(password, superAdmin.password);
      } else {
        // Password might be plain text, compare directly first
        isValidPassword = password === superAdmin.password;
        if (!isValidPassword) {
          // Try bcrypt anyway
          isValidPassword = await bcrypt.compare(password, superAdmin.password);
        }
      }

      console.log("Password validation result:", isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Return super admin details
      res.json({
        id: superAdmin.id,
        username: superAdmin.username,
        name: superAdmin.name,
        email: superAdmin.email,
        role: "superadmin",
      });
    } catch (error) {
      console.error("Super admin login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Admin authentication
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);

      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        console.log("Admin not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Checking password for admin:", username);
      console.log("Stored password hash:", admin.password);
      console.log("Provided password:", password);

      // Check if password is already hashed or plain text
      let isValidPassword = false;
      if (admin.password.startsWith('$2')) {
        // Password is hashed, use bcrypt
        isValidPassword = await bcrypt.compare(password, admin.password);
      } else {
        // Password might be plain text, compare directly first
        isValidPassword = password === admin.password;
        if (!isValidPassword) {
          // Try bcrypt anyway
          isValidPassword = await bcrypt.compare(password, admin.password);
        }
      }

      console.log("Password validation result:", isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd set up proper session management here
      res.json({
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        providerId: admin.providerId,
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "Login failed" });
    }
  });

  // Admin profile routes
  app.get("/api/admin/profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const admin = await storage.getAdmin(id);

      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Don't return password in response
      const { password, ...adminData } = admin;
      res.json(adminData);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/admin/profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, currentPassword, newPassword } = req.body;

      // Get the current admin
      const currentAdmin = await storage.getAdmin(id);
      if (!currentAdmin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // If trying to change password, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }

        // Verify current password
        let isValidPassword = false;
        if (currentAdmin.password.startsWith('$2')) {
          // Password is hashed, use bcrypt
          isValidPassword = await bcrypt.compare(currentPassword, currentAdmin.password);
        } else {
          // Password might be plain text, compare directly first
          isValidPassword = currentPassword === currentAdmin.password;
          if (!isValidPassword) {
            // Try bcrypt anyway
            isValidPassword = await bcrypt.compare(currentPassword, currentAdmin.password);
          }
        }

        if (!isValidPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Prepare update data
      const updateData: { name?: string; email?: string; password?: string } = {};

      if (name && name !== currentAdmin.name) {
        updateData.name = name;
      }

      if (email && email !== currentAdmin.email) {
        // Check if email is already taken by another admin
        const existingAdmin = await storage.getAdminByUsername(email);
        if (existingAdmin && existingAdmin.id !== id) {
          return res.status(400).json({ message: "Email already taken by another admin" });
        }
        updateData.email = email;
      }

      if (newPassword) {
        // Hash the new password
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      // Update profile
      const updatedAdmin = await storage.updateAdminProfile(id, updateData);

      if (!updatedAdmin) {
        return res.status(404).json({ message: "Failed to update profile" });
      }

      // Don't return password in response
      const { password, ...adminData } = updatedAdmin;
      res.json(adminData);
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Super Admin Routes (Provider Management)

  // Get all providers
  app.get("/api/superadmin/providers", async (req, res) => {
    try {
      const providers = await storage.getAllProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  // Create new provider
  app.post("/api/superadmin/providers", async (req, res) => {
    try {
      const { adminCredentials, ...providerData } = req.body;

      // Validate provider data
      const validatedProviderData = providerCreateSchema.parse(providerData);

      // Create the provider first
      const provider = await storage.createProvider(validatedProviderData);

      // If admin credentials are provided, create admin account
      if (adminCredentials) {
        const { username, password, name, email } = adminCredentials;

        if (!username || !password || !name || !email) {
          return res.status(400).json({ 
            message: "All admin credential fields are required" 
          });
        }

        // Check if admin username already exists
        const existingAdmin = await storage.getAdminByUsername(username);
        if (existingAdmin) {
          return res.status(400).json({ 
            message: "Admin username already exists" 
          });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin account for the provider
        const adminAccount = await storage.createAdmin({
          username,
          password: hashedPassword,
          name,
          email,
          providerId: provider.id,
          role: "admin",
          isActive: true
        });

        console.log(`✅ Created admin account '${username}' for provider '${provider.businessName}'`);

        res.status(201).json({
          provider,
          admin: {
            id: adminAccount.id,
            username: adminAccount.username,
            name: adminAccount.name,
            email: adminAccount.email
          },
          message: "Provider and admin account created successfully"
        });
      } else {
        res.status(201).json(provider);
      }
    } catch (error) {
      console.error("Error creating provider:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create provider" 
      });
    }
  });

  // Update provider
  app.put("/api/superadmin/providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const providerData = providerCreateSchema.partial().parse(req.body);
      const provider = await storage.updateProvider(id, providerData);

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      res.json(provider);
    } catch (error) {
      console.error("Error updating provider:", error);
      res.status(400).json({ message: "Failed to update provider" });
    }
  });

  // Suspend provider
  app.post("/api/superadmin/providers/:id/suspend", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.suspendProvider(id);

      if (!success) {
        return res.status(404).json({ message: "Provider not found" });
      }

      res.json({ success: true, message: "Provider suspended" });
    } catch (error) {
      console.error("Error suspending provider:", error);
      res.status(500).json({ message: "Failed to suspend provider" });
    }
  });

  // Activate provider
  app.post("/api/superadmin/providers/:id/activate", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.activateProvider(id);

      if (!success) {
        return res.status(404).json({ message: "Provider not found" });
      }

      res.json({ success: true, message: "Provider activated" });
    } catch (error) {
      console.error("Error activating provider:", error);
      res.status(500).json({ message: "Failed to activate provider" });
    }
  });

  // Get all routers with provider assignments
  app.get("/api/superadmin/routers", async (req, res) => {
    try {
      const routers = await storage.getAllRouters();
      res.json(routers);
    } catch (error) {
      console.error("Error fetching routers:", error);
      res.status(500).json({ message: "Failed to fetch routers" });
    }
  });

  // Get unassigned routers
  app.get("/api/superadmin/routers/unassigned", async (req, res) => {
    try {
      const routers = await storage.getUnassignedRouters();
      res.json(routers);
    } catch (error) {
      console.error("Error fetching unassigned routers:", error);
      res.status(500).json({ message: "Failed to fetch unassigned routers" });
    }
  });

  // Assign router to provider
  app.post("/api/superadmin/routers/assign", async (req, res) => {
    try {
      const { routerId, providerId, location } = routerAssignSchema.parse(req.body);

      const success = await storage.assignRouterToProvider(routerId, providerId);
      if (!success) {
        return res.status(400).json({ message: "Failed to assign router" });
      }

      // Update router location if provided
      if (location) {
        await storage.updateRouter(routerId, { location });
      }

      res.json({ success: true, message: "Router assigned successfully" });
    } catch (error) {
      console.error("Error assigning router:", error);
      res.status(400).json({ message: "Failed to assign router" });
    }
  });

  // Unassign router from provider
  app.post("/api/superadmin/routers/:id/unassign", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.unassignRouter(id);

      if (!success) {
        return res.status(404).json({ message: "Router not found" });
      }

      res.json({ success: true, message: "Router unassigned" });
    } catch (error) {
      console.error("Error unassigning router:", error);
      res.status(500).json({ message: "Failed to unassign router" });
    }
  });

  // Get all providers revenue
  app.get("/api/superadmin/revenue/providers", async (req, res) => {
    try {
      const revenue = await storage.getAllProvidersRevenue();
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching providers revenue:", error);
      res.status(500).json({ message: "Failed to fetch providers revenue" });
    }
  });

  // Get provider revenue details
  app.get("/api/superadmin/revenue/providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const revenue = await storage.getProviderRevenue(id);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching provider revenue:", error);
      res.status(500).json({ message: "Failed to fetch provider revenue" });
    }
  });

  // Get router revenue details
  app.get("/api/superadmin/routers/:id/revenue", async (req, res) => {
    try {
      const { id } = req.params;
      const revenue = await storage.getRouterRevenue(id);
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching router revenue:", error);
      res.status(500).json({ message: "Failed to fetch router revenue" });
    }
  });

  // Payment Gateway Management

  // Get all available payment gateways
  app.get("/api/superadmin/payment-gateways", async (req, res) => {
    try {
      const gateways = await storage.getAllPaymentGateways();
      res.json(gateways);
    } catch (error) {
      console.error("Error fetching payment gateways:", error);
      res.status(500).json({ message: "Failed to fetch payment gateways" });
    }
  });

  // Create payment gateway
  app.post("/api/superadmin/payment-gateways", async (req, res) => {
    try {
      const gatewayData = insertPaymentGatewaySchema.parse(req.body);
      const gateway = await storage.createPaymentGateway(gatewayData);
      res.status(201).json(gateway);
    } catch (error) {
      console.error("Error creating payment gateway:", error);
      res.status(400).json({ message: "Failed to create payment gateway" });
    }
  });

  // Configure payment gateway for provider
  app.post("/api/superadmin/providers/:id/payment-gateway", async (req, res) => {
    try {
      const { id: providerId } = req.params;
      // Add providerId from URL params to request body for validation
      const requestData = { ...req.body, providerId };
      const validatedData = paymentGatewayConfigSchema.parse(requestData);

      // Try to get external gateway data first
      let gateway;
      let gatewayData;

      try {
        // Load external gateway data from JSON files
        const banksData = fs.readFileSync(path.join(process.cwd(), 'banks.json'), 'utf8');
        const mobileMoneyData = fs.readFileSync(path.join(process.cwd(), 'mobile-money.json'), 'utf8');

        const banks = JSON.parse(banksData);
        const mobileMoneyProviders = JSON.parse(mobileMoneyData);

        // Find external gateway data
        gatewayData = banks.find((bank: any) => bank.id === validatedData.gatewayId) ||
                     mobileMoneyProviders.find((provider: any) => provider.id === validatedData.gatewayId);

        if (gatewayData) {
          // Create a virtual gateway object for external gateways
          gateway = {
            id: validatedData.gatewayId,
            name: gatewayData.name,
            type: gatewayData.provider ? (gatewayData.provider === 'safaricom' ? 'mpesa' : gatewayData.provider) : 'bank',
            hasAutoApi: true, // External gateways have auto-filled config
            sandboxConfig: {
              paybill: gatewayData.paybill,
              accountReference: gatewayData.accountReference,
              transactionDesc: gatewayData.transactionDesc
            },
            productionConfig: {
              paybill: gatewayData.paybill,
              accountReference: gatewayData.accountReference,
              transactionDesc: gatewayData.transactionDesc
            }
          };
        }
      } catch (jsonError) {
        console.log("Could not load external gateway data:", jsonError);
      }

      // Fallback to database gateway if not found in JSON
      if (!gateway) {
        gateway = await storage.getPaymentGateway(validatedData.gatewayId);
      }

      if (!gateway) {
        return res.status(404).json({ message: "Payment gateway not found" });
      }

      // Prepare configuration based on auto API or custom API
      let finalConfig = validatedData.configuration || {};

      if (validatedData.useAutoApi && gateway.hasAutoApi) {
        // Use system's auto API configuration
        const autoConfig = validatedData.environment === 'production' 
          ? gateway.productionConfig 
          : gateway.sandboxConfig;

        if (autoConfig && typeof autoConfig === 'object') {
          finalConfig = {
            ...autoConfig,
            accountNumber: validatedData.accountNumber,
            environment: validatedData.environment,
            useAutoApi: true,
          };
        }
      } else {
        // Use custom API configuration
        finalConfig = {
          ...(validatedData.configuration || {}),
          accountNumber: validatedData.accountNumber,
          environment: validatedData.environment,
          useAutoApi: false,
        } as any;
      }

      // Map external gateway IDs to database gateway IDs
      let dbGatewayId = validatedData.gatewayId;

      if (gatewayData) {
        // This is an external gateway from JSON files
        // Map to existing database gateways based on type
        const existingGateways = await storage.getAllPaymentGateways();

        if (gatewayData.provider) {
          // Mobile money provider
          if (gatewayData.provider === 'safaricom') {
            const mpesaGateway = existingGateways.find(g => g.type === 'mpesa');
            if (mpesaGateway) dbGatewayId = mpesaGateway.id;
          } else if (gatewayData.provider === 'airtel') {
            const airtelGateway = existingGateways.find(g => g.type === 'airtel_money');
            if (airtelGateway) dbGatewayId = airtelGateway.id;
          }
        } else {
          // Bank - map to any existing bank gateway
          const bankGateway = existingGateways.find(g => g.type === 'bank');
          if (bankGateway) dbGatewayId = bankGateway.id;
        }
      }

      const config = await storage.createProviderPaymentGateway({
        providerId,
        paymentGatewayId: dbGatewayId,
        routerId: validatedData.routerId || null,
        configuration: finalConfig,
        isActive: true,
      });

      res.status(201).json(config);
    } catch (error) {
      console.error("Error configuring payment gateway:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to configure payment gateway" 
      });
    }
  });

  // Update provider payment gateway configuration
  app.put("/api/superadmin/providers/:id/payment-gateway/:gatewayConfigId", async (req, res) => {
    try {
      const { id: providerId, gatewayConfigId } = req.params;
      const requestData = { ...req.body, providerId };
      const validatedData = paymentGatewayConfigSchema.parse(requestData);

      const updatedConfig = await storage.updateProviderPaymentGateway(gatewayConfigId, {
        routerId: validatedData.routerId || null,
        configuration: {
          ...validatedData.configuration,
          environment: validatedData.environment,
          useAutoApi: validatedData.useAutoApi,
          accountNumber: validatedData.accountNumber,
        },
      });

      if (!updatedConfig) {
        return res.status(404).json({ message: "Payment gateway configuration not found" });
      }

      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating payment gateway:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to update payment gateway" 
      });
    }
  });

  // Delete provider payment gateway configuration
  app.delete("/api/superadmin/providers/:id/payment-gateway/:gatewayConfigId", async (req, res) => {
    try {
      const { gatewayConfigId } = req.params;

      const success = await storage.deleteProviderPaymentGateway(gatewayConfigId);

      if (!success) {
        return res.status(404).json({ message: "Payment gateway configuration not found" });
      }

      res.json({ success: true, message: "Payment gateway configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting payment gateway:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete payment gateway" 
      });
    }
  });

  // Get provider payment configuration (for payment gateway config component)
  app.get("/api/superadmin/providers/:id/payment-config", async (req, res) => {
    try {
      const { id } = req.params;
      // For now, return a basic config structure
      res.json({ configured: false });
    } catch (error) {
      console.error("Error fetching provider payment config:", error);
      res.status(500).json({ message: "Failed to fetch payment configuration" });
    }
  });

  // Get provider by ID (for superadmin provider profile)
  app.get("/api/superadmin/providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.getProvider(id);

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      res.json(provider);
    } catch (error) {
      console.error("Error fetching provider:", error);
      res.status(500).json({ message: "Failed to fetch provider" });
    }
  });

  // Get provider admin for sign-in functionality
  app.get("/api/superadmin/providers/:id/admin", async (req, res) => {
    try {
      const { id } = req.params;
      const admin = await storage.getAdminByProviderId(id);

      if (!admin) {
        return res.status(404).json({ message: "Provider admin not found" });
      }

      // Return admin data without password
      const { password, ...adminData } = admin;
      res.json({
        ...adminData,
        role: "admin",
        providerId: id,
      });
    } catch (error) {
      console.error("Error fetching provider admin:", error);
      res.status(500).json({ message: "Failed to fetch provider admin" });
    }
  });

  // Change provider admin password
  app.post("/api/superadmin/providers/:id/change-password", async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Get provider admin
      const admin = await storage.getAdminByProviderId(id);
      if (!admin) {
        return res.status(404).json({ message: "Provider admin not found" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update admin password
      const success = await storage.updateAdminPassword(admin.id, hashedPassword);

      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing provider admin password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get provider payment gateways
  app.get("/api/superadmin/providers/:id/payment-gateways", async (req, res) => {
    try {
      const { id } = req.params;
      const gateways = await storage.getProviderPaymentGateways(id);
      res.json(gateways);
    } catch (error) {
      console.error("Error fetching provider payment gateways:", error);
      res.status(500).json({ message: "Failed to fetch provider payment gateways" });
    }
  });

  // Get banks data
  app.get("/api/banks", async (req, res) => {
    try {
      const banksData = fs.readFileSync(path.join(process.cwd(), 'banks.json'), 'utf8');
      const banks = JSON.parse(banksData);
      res.json(banks);
    } catch (error) {
      console.error('Error loading banks:', error);
      res.status(500).json({ error: 'Failed to load banks data' });
    }
  });

  // Get mobile money providers data
  app.get("/api/mobile-money", async (req, res) => {
    try {
      const mobileMoneyData = fs.readFileSync(path.join(process.cwd(), 'mobile-money.json'), 'utf8');
      const mobileMoneyProviders = JSON.parse(mobileMoneyData);
      res.json(mobileMoneyProviders);
    } catch (error) {
      console.error('Error loading mobile money providers:', error);
      res.status(500).json({ error: 'Failed to load mobile money providers data' });
    }
  });

  // Payout callback endpoints for M-Pesa B2B responses
  app.post("/api/payment/payout/result", async (req, res) => {
    try {
      console.log("💸 M-Pesa B2B payout result received:", JSON.stringify(req.body, null, 2));

      const result = req.body?.Result;
      if (result) {
        if (result.ResultCode === 0) {
          console.log("✅ Payout successful:", result.ResultDesc);
        } else {
          console.log("❌ Payout failed:", result.ResultDesc);
        }
      }

      // Always respond with success to avoid M-Pesa retries
      res.json({ ResponseCode: "00000000", ResponseDesc: "success" });
    } catch (error) {
      console.error("❌ Error processing payout result:", error);
      res.json({ ResponseCode: "00000000", ResponseDesc: "success" });
    }
  });

  app.post("/api/payment/payout/timeout", async (req, res) => {
    try {
      console.log("⏰ M-Pesa B2B payout timeout received:", JSON.stringify(req.body, null, 2));

      // Always respond with success
      res.json({ ResponseCode: "00000000", ResponseDesc: "success" });
    } catch (error) {
      console.error("❌ Error processing payout timeout:", error);
      res.json({ ResponseCode: "00000000", ResponseDesc: "success" });
    }
  });

  // Get payment gateway by external ID (from JSON files)
  app.get("/api/payment-gateway/:externalId", async (req, res) => {
    try {
      const { externalId } = req.params;

      // Load banks and mobile money data
      const banksData = fs.readFileSync(path.join(process.cwd(), 'banks.json'), 'utf8');
      const mobileMoneyData = fs.readFileSync(path.join(process.cwd(), 'mobile-money.json'), 'utf8');

      const banks = JSON.parse(banksData);
      const mobileMoneyProviders = JSON.parse(mobileMoneyData);

      // Find in banks
      let externalData = banks.find((bank: any) => bank.id === externalId);
      let gatewayType = 'bank';

      if (!externalData) {
        // Find in mobile money providers
        externalData = mobileMoneyProviders.find((provider: any) => provider.id === externalId);
        gatewayType = 'mobile_money';
      }

      if (!externalData) {
        return res.status(404).json({ error: 'Payment gateway not found' });
      }

      // Create the unified response with both external data and database gateway ID
      res.json({
        id: externalId, // External ID for frontend
        name: externalData.name,
        type: gatewayType,
        paybill: externalData.paybill,
        accountReference: externalData.accountReference,
        transactionDesc: externalData.transactionDesc,
        isActive: externalData.isActive !== false
      });
    } catch (error) {
      console.error('Error getting payment gateway:', error);
      res.status(500).json({ error: 'Failed to get payment gateway' });
    }
  });

  // Protected admin routes (in a real app, add authentication middleware)

  // Dashboard statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Get router-specific statistics
  app.get("/api/admin/stats/router/:routerId", async (req, res) => {
    try {
      const { routerId } = req.params;
      const stats = await storage.getRouterSpecificStats(routerId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching router stats:", error);
      res.status(500).json({ message: "Failed to fetch router statistics" });
    }
  });

  // Subscription plans management
  app.get("/api/admin/plans", async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/plans", async (req, res) => {
    try {
      const planData = insertSubscriptionPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(400).json({ message: "Failed to create plan" });
    }
  });

  app.put("/api/admin/plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const planData = insertSubscriptionPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(id, planData);

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(400).json({ message: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePlan(id);

      if (!success) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // Users management
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { providerId } = req.query;
      let users = await storage.getAllUsers();
      
      // Filter users by provider if providerId is provided
      if (providerId && providerId !== 'undefined' && providerId !== 'null') {
        // Get routers belonging to this provider
        const providerRouters = await storage.getRoutersByProvider(providerId as string);
        const routerIds = providerRouters.map(router => router.id);
        
        // Filter users to only show those assigned to provider's routers
        users = users.filter(user => 
          user.routerId && routerIds.includes(user.routerId)
        );
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/active", async (req, res) => {
    try {
      const { providerId } = req.query;
      let users = await storage.getActiveUsers();
      
      // Filter users by provider if providerId is provided
      if (providerId && providerId !== 'undefined' && providerId !== 'null') {
        // Get routers belonging to this provider
        const providerRouters = await storage.getRoutersByProvider(providerId as string);
        const routerIds = providerRouters.map(router => router.id);
        
        // Filter users to only show those assigned to provider's routers
        users = users.filter(user => 
          user.routerId && routerIds.includes(user.routerId)
        );
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });

  // Transactions management
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/admin/transactions/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const transactions = await storage.getRecentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      res.status(500).json({ message: "Failed to fetch recent transactions" });
    }
  });

  // Get routers assigned to specific provider - Enhanced with better error handling
  app.get("/api/admin/routers/provider/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      console.log("📡 Fetching routers for provider:", providerId);

      if (!providerId || providerId === 'undefined' || providerId === 'null' || providerId === '') {
        console.log("❌ Invalid provider ID:", providerId);
        return res.status(400).json({ 
          message: "Valid Provider ID is required",
          providerId: providerId,
          error: "INVALID_PROVIDER_ID"
        });
      }

      // For admin requests without provider ID, return empty array instead of error
      if (providerId === 'default') {
        console.log("📭 Default provider request, returning empty array");
        return res.json([]);
      }

      // Verify provider exists
      const provider = await storage.getProvider(providerId);
      if (!provider) {
        console.log("❌ Provider not found:", providerId);
        return res.status(404).json({ 
          message: "Provider not found",
          providerId: providerId,
          error: "PROVIDER_NOT_FOUND"
        });
      }

      console.log(`✅ Provider found: ${provider.businessName} (${providerId})`);

      const routers = await storage.getRoutersByProvider(providerId);
      console.log(`📊 PROVIDER ROUTERS QUERY RESULT - Found ${routers.length} routers for provider ${provider.businessName}:`);

      if (routers.length > 0) {
        routers.forEach((router, index) => {
          console.log(`  ${index + 1}. ${router.name} (${router.host}:${router.port}) - ${router.isActive ? 'Active' : 'Inactive'} - ${router.isOnline ? 'Online' : 'Offline'}`);
        });
      } else {
        console.log(`⚠️  No routers assigned to provider ${provider.businessName} (${providerId})`);

        // Check if there are any unassigned routers
        const unassignedRouters = await storage.getUnassignedRouters();
        console.log(`📋 Available unassigned routers: ${unassignedRouters.length}`);
      }

      res.json(routers);
    } catch (error) {
      console.error("❌ Error fetching provider routers:", error);
      res.status(500).json({ 
        message: "Failed to fetch provider routers", 
        error: error instanceof Error ? error.message : "Unknown error",
        providerId: req.params.providerId
      });
    }
  });

  // MikroTik routers management
  app.get("/api/admin/routers", async (req, res) => {
    try {
      // For now, return all routers since we don't have proper session management
      // In production, you would extract providerId from JWT token or session
      const routers = await storage.getAllRouters();

      // Filter routers to only show those without provider assignment or system routers
      // This is a temporary solution until proper authentication is implemented
      const filteredRouters = routers.filter(router => 
        !router.providerId || router.providerId === null
      );

      res.json(filteredRouters);
    } catch (error) {
      console.error("Error fetching routers:", error);
      res.status(500).json({ message: "Failed to fetch routers" });
    }
  });

  app.post("/api/admin/routers", async (req, res) => {
    try {
      const routerData = insertMikrotikRouterSchema.parse(req.body);
      const router = await storage.createRouter(routerData);

      // Test connection to the router
      const connectionTest = await mikrotikService.testConnection(router);
      if (connectionTest) {
        await mikrotikService.connectToRouter(router);
        await storage.updateRouterLastSeen(router.id);
      }

      res.status(201).json({ ...router, connectionTest });
    } catch (error) {
      console.error("Error creating router:", error);
      res.status(400).json({ message: "Failed to create router" });
    }
  });

  app.put("/api/admin/routers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const routerData = insertMikrotikRouterSchema.partial().parse(req.body);
      const router = await storage.updateRouter(id, routerData);

      if (!router) {
        return res.status(404).json({ message: "Router not found" });
      }

      res.json(router);
    } catch (error) {
      console.error("Error updating router:", error);
      res.status(400).json({ message: "Failed to update router" });
    }
  });

  app.delete("/api/admin/routers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteRouter(id);

      if (!success) {
        return res.status(404).json({ message: "Router not found" });
      }

      res.json({ success: true, message: "Router deleted successfully" });
    } catch (error) {
      console.error("Error deleting router:", error);
      res.status(500).json({ message: "Failed to delete router" });
    }
  });

  // Test router connection
  app.post("/api/admin/routers/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const router = await storage.getRouter(id);

      if (!router) {
        return res.status(404).json({ message: "Router not found" });
      }

      const connectionTest = await mikrotikService.testConnection(router);

      if (connectionTest) {
        await storage.updateRouterLastSeen(router.id);
      }

      res.json({ success: connectionTest });
    } catch (error) {
      console.error("Error testing router connection:", error);
      res.status(500).json({ message: "Failed to test router connection" });
    }
  });

  // Enhanced auto-discover MikroTik routers
  app.post("/api/admin/routers/discover", async (req, res) => {
    try {
      console.log("Starting comprehensive MikroTik router auto-discovery...");
      const result = await routerDiscoveryService.autoRegisterDiscoveredRouters();

      res.json({
        success: true,
        message: `Auto-discovery complete: ${result.registered} routers registered, ${result.existing} already exist, ${result.failed} failed to connect`,
        details: {
          registered: result.registered,
          existing: result.existing,
          failed: result.failed,
          total: result.registered + result.existing + result.failed
        },
      });
    } catch (error) {
      console.error("Error during router auto-discovery:", error);
      res.status(500).json({ 
        success: false,
        message: "Router auto-discovery failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get detailed discovery scan without registration
  app.post("/api/admin/routers/scan-network", async (req, res) => {
    try {
      console.log("Scanning network for MikroTik routers...");
      const discovered = await routerDiscoveryService.discoverRouters();

      res.json({
        success: true,
        message: `Found ${discovered.length} MikroTik routers on the network`,
        routers: discovered.map(router => ({
          host: router.host,
          port: router.port,
          identity: router.identity || `Router-${router.host}`,
          name: router.name || `Auto-${router.host}`,
        }))
      });
    } catch (error) {
      console.error("Error scanning network:", error);
      res.status(500).json({ 
        success: false,
        message: "Network scanning failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Scan specific host for MikroTik router
  app.post("/api/admin/routers/scan", async (req, res) => {
    try {
      const { host, port = 8728 } = req.body;

      if (!host) {
        return res.status(400).json({ message: "Host is required" });
      }

      const result = await routerDiscoveryService.scanSpecificHost(host, port);

      if (result.success) {
        res.json({
          success: true,
          router: result.router,
          message: "Router found and can be added",
        });
      } else {
        res.json({
          success: false,
          message: result.error || "Router not found or not accessible",
        });
      }
    } catch (error) {
      console.error("Error scanning host:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to scan host",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate OpenVPN configuration for MikroTik router
  app.post("/api/admin/routers/generate-ovpn", async (req, res) => {
    try {
      const { routerName, routerosVersion = "7.x" } = req.body;

      if (!routerName) {
        return res.status(400).json({ message: "Router name is required" });
      }

      const config = ovpnConfigService.generateRouterConfig(routerName, routerosVersion);
      const mikrotikScript = ovpnConfigService.generateMikroTikScript(config, routerosVersion);
      const setupGuide = ovpnConfigService.generateSetupGuide(config);

      res.json({
        ...config,
        mikrotikScript,
        setupGuide,
        success: true,
        message: "OpenVPN configuration generated successfully",
      });
    } catch (error) {
      console.error("Error generating OpenVPN configuration:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to generate OpenVPN configuration",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Regenerate MikroTik script and setup guide for existing OpenVPN config
  app.post("/api/admin/routers/regenerate-script", async (req, res) => {
    try {
      const { config, routerosVersion = "7.x" } = req.body;

      if (!config) {
        return res.status(400).json({ message: "OpenVPN configuration is required" });
      }

      const mikrotikScript = ovpnConfigService.generateMikroTikScript(config, routerosVersion);
      const setupGuide = ovpnConfigService.generateSetupGuide(config);

      res.json({
        mikrotikScript,
        setupGuide,
        success: true,
        message: "Configuration script regenerated successfully",
      });
    } catch (error) {
      console.error("Error regenerating OpenVPN script:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to regenerate configuration script",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Voucher management
  app.get("/api/admin/vouchers", async (req, res) => {
    try {
      const vouchers = await storage.getAllVouchers();
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      res.status(500).json({ message: "Failed to fetch vouchers" });
    }
  });

  app.post("/api/admin/vouchers/generate", async (req, res) => {
    try {
      const { planId, quantity, expiresAt } = voucherGenerateSchema.parse(req.body);
      const admin = req.body.adminId; // In real app, get from session

      // Generate unique voucher codes
      const voucherCodes = [];
      for (let i = 0; i < quantity; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        voucherCodes.push({
          code,
          planId,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: admin || "system",
        });
      }

      const createdVouchers = await storage.createVouchers(voucherCodes);

      res.status(201).json({
        success: true,
        message: `Generated ${quantity} voucher${quantity > 1 ? 's' : ''}`,
        vouchers: createdVouchers,
      });
    } catch (error) {
      console.error("Error generating vouchers:", error);
      res.status(400).json({ message: "Failed to generate vouchers" });
    }
  });

  app.get("/api/admin/vouchers/stats", async (req, res) => {
    try {
      const stats = await storage.getVoucherStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching voucher stats:", error);
      res.status(500).json({ message: "Failed to fetch voucher statistics" });
    }
  });

  // Get routers assigned to specific provider
  app.get("/api/admin/routers/provider/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      console.log("Fetching routers for provider:", providerId);
      const routers = await storage.getRoutersByProvider(providerId);
      console.log("Found routers:", routers.length);
      res.json(routers);
    } catch (error) {
      console.error("Error fetching provider routers:", error);
      res.status(500).json({ message: "Failed to fetch provider routers" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Get current settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
      });
    }
  });

  // Admin settings save
  app.post("/api/admin/settings", async (req, res) => {
    try {
      const settingsData = req.body;
      console.log("Settings update received:", settingsData);

      const updatedSettings = await storage.updateSettings(settingsData);

      res.json({
        success: true,
        message: "Settings updated successfully",
        settings: updatedSettings,
      });
    } catch (error) {
      console.error("Settings save error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save settings",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}