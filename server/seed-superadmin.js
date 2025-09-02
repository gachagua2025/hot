import { db } from './db.js';
import { superAdmins } from '../shared/schema.js';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  try {
    const password = await bcrypt.hash('superadmin123', 10);

    const result = await db.insert(superAdmins).values({
      username: 'superadmin',
      password,
      name: 'System Administrator',
      email: 'superadmin@system.com',
      isActive: true
    }).onConflictDoUpdate({
      target: superAdmins.username,
      set: {
        password,
        name: 'System Administrator',
        email: 'superadmin@system.com',
        isActive: true
      }
    });

    console.log('✅ Super admin user created/updated successfully');
    console.log('Username: superadmin');
    console.log('Password: superadmin123');
    console.log('Access URL: /superadmin');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();