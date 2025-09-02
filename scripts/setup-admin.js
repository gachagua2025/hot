
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { admins, superAdmins, subscriptionPlans } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/hotspot_db",
});

const db = drizzle(pool);

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin credentials...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdminHashedPassword = await bcrypt.hash('superadmin123', 10);

    // Check if admin already exists
    const existingAdmin = await db.select().from(admins).where(eq(admins.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      // Update existing admin
      await db.update(admins)
        .set({
          password: hashedPassword,
          name: 'System Administrator',
          email: 'admin@hotspot.com',
          role: 'admin',
        })
        .where(eq(admins.username, 'admin'));
      console.log('✅ Updated existing admin user');
    } else {
      // Create new admin
      await db.insert(admins).values({
        username: 'admin',
        password: hashedPassword,
        name: 'System Administrator',
        email: 'admin@hotspot.com',
        role: 'admin',
      });
      console.log('✅ Created new admin user');
    }

    // Check if super admin already exists
    const existingSuperAdmin = await db.select().from(superAdmins).where(eq(superAdmins.username, 'superadmin')).limit(1);
    
    if (existingSuperAdmin.length > 0) {
      // Update existing super admin
      await db.update(superAdmins)
        .set({
          password: superAdminHashedPassword,
          name: 'Super Administrator',
          email: 'superadmin@hotspot.com',
        })
        .where(eq(superAdmins.username, 'superadmin'));
      console.log('✅ Updated existing super admin user');
    } else {
      // Create new super admin
      await db.insert(superAdmins).values({
        username: 'superadmin',
        password: superAdminHashedPassword,
        name: 'Super Administrator',
        email: 'superadmin@hotspot.com',
      });
      console.log('✅ Created new super admin user');
    }

    // Check if sample plans exist
    const existingPlans = await db.select().from(subscriptionPlans).limit(1);
    
    if (existingPlans.length === 0) {
      // Create sample subscription plans
      await db.insert(subscriptionPlans).values([
        {
          name: 'Basic Plan',
          description: '1 hour of internet access',
          price: '10.00',
          durationHours: 1,
          speedMbps: 5,
          isActive: true,
        },
        {
          name: 'Standard Plan',
          description: '6 hours of internet access',
          price: '50.00',
          durationHours: 6,
          speedMbps: 10,
          isActive: true,
        },
        {
          name: 'Premium Plan',
          description: '24 hours of internet access',
          price: '100.00',
          durationHours: 24,
          speedMbps: 20,
          isActive: true,
        },
      ]);
      console.log('✅ Created sample subscription plans');
    } else {
      console.log('📋 Subscription plans already exist');
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('👤 Admin Login:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🔐 Super Admin Login:');
    console.log('   Username: superadmin');
    console.log('   Password: superadmin123');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

setupAdmin();
