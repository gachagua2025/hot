#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production setup script
async function setupProduction() {
  console.log('🚀 Setting up production environment...');

  // Check for required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_BUSINESS_SHORT_CODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL'
  ];

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(envVar => console.error(`   - ${envVar}`));
    process.exit(1);
  }

  try {
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    console.log('✅ Database connection established');

    // Create admin user if not exists
    const adminExists = await pool.query(
      'SELECT id FROM admins WHERE username = $1',
      ['admin']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await pool.query(
        `INSERT INTO admins (id, username, password, name, email, role, created_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        ['admin', hashedPassword, 'Admin User', 'admin@hotspot.com', 'admin']
      );
      console.log('✅ Admin user created (username: admin, password: admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create default subscription plans if not exist
    const plansExist = await pool.query('SELECT id FROM subscription_plans LIMIT 1');
    
    if (plansExist.rows.length === 0) {
      const plans = [
        {
          name: 'Basic Plan',
          description: 'Perfect for light browsing and social media',
          price: 50,
          duration: 60, // 1 hour
          bandwidth: '1M/1M',
          features: ['1 Hour Access', '1 Mbps Speed', 'Basic Support']
        },
        {
          name: 'Standard Plan',
          description: 'Great for streaming and downloads',
          price: 100,
          duration: 180, // 3 hours
          bandwidth: '5M/5M',
          features: ['3 Hours Access', '5 Mbps Speed', 'Priority Support']
        },
        {
          name: 'Premium Plan',
          description: 'Maximum speed for business and gaming',
          price: 200,
          duration: 480, // 8 hours
          bandwidth: '10M/10M',
          features: ['8 Hours Access', '10 Mbps Speed', '24/7 Support', 'Gaming Optimized']
        }
      ];

      for (const plan of plans) {
        await pool.query(
          `INSERT INTO subscription_plans (id, name, description, price, duration_minutes, bandwidth_limit, features, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
          [plan.name, plan.description, plan.price, plan.duration, plan.bandwidth, JSON.stringify(plan.features)]
        );
      }
      console.log('✅ Default subscription plans created');
    } else {
      console.log('✅ Subscription plans already exist');
    }

    await pool.end();
    console.log('🎉 Production setup completed successfully!');

  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupProduction();
}

module.exports = setupProduction;