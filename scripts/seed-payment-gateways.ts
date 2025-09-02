
import { db } from "../server/db";
import { paymentGateways } from "../shared/schema";

async function seedPaymentGateways() {
  try {
    console.log('🔧 Seeding payment gateways...');

    // Clear existing payment gateways
    await db.delete(paymentGateways);

    // Create default payment gateways
    await db.insert(paymentGateways).values([
      {
        name: 'M-Pesa',
        type: 'mpesa',
        provider: 'safaricom',
        isActive: true,
        hasAutoApi: true,
        supportsCustomApi: true,
        sandboxConfig: {
          apiUrl: 'https://sandbox.safaricom.co.ke',
          consumerKey: 'SYSTEM_SANDBOX_KEY',
          consumerSecret: 'SYSTEM_SANDBOX_SECRET'
        },
        productionConfig: {
          apiUrl: 'https://api.safaricom.co.ke',
          consumerKey: 'SYSTEM_PRODUCTION_KEY',
          consumerSecret: 'SYSTEM_PRODUCTION_SECRET'
        },
        requiredFields: ['accountNumber', 'businessShortCode'],
        configuration: {
          description: 'M-Pesa payment integration with auto and custom API support'
        }
      },
      {
        name: 'Airtel Money',
        type: 'airtel_money',
        provider: 'airtel',
        isActive: true,
        hasAutoApi: true,
        supportsCustomApi: true,
        sandboxConfig: {
          apiUrl: 'https://sandbox.airtel.africa',
          clientId: 'SYSTEM_SANDBOX_CLIENT_ID',
          clientSecret: 'SYSTEM_SANDBOX_CLIENT_SECRET'
        },
        productionConfig: {
          apiUrl: 'https://api.airtel.africa',
          clientId: 'SYSTEM_PRODUCTION_CLIENT_ID',
          clientSecret: 'SYSTEM_PRODUCTION_CLIENT_SECRET'
        },
        requiredFields: ['accountNumber', 'merchantCode'],
        configuration: {
          description: 'Airtel Money payment integration with auto and custom API support'
        }
      },
      {
        name: 'KCB Bank',
        type: 'bank',
        provider: 'kcb',
        isActive: true,
        hasAutoApi: false,
        supportsCustomApi: true,
        sandboxConfig: {},
        productionConfig: {},
        requiredFields: ['accountNumber', 'bankCode', 'merchantId'],
        configuration: {
          description: 'KCB Bank payment integration (custom API only)'
        }
      },
      {
        name: 'Equity Bank',
        type: 'bank',
        provider: 'equity',
        isActive: true,
        hasAutoApi: false,
        supportsCustomApi: true,
        sandboxConfig: {},
        productionConfig: {},
        requiredFields: ['accountNumber', 'bankCode', 'merchantId'],
        configuration: {
          description: 'Equity Bank payment integration (custom API only)'
        }
      }
    ]);

    console.log('✅ Payment gateways seeded successfully!');

  } catch (error) {
    console.error('❌ Failed to seed payment gateways:', error);
  } finally {
    process.exit(0);
  }
}

seedPaymentGateways();
