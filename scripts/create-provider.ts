import { db } from '../server/db';
import { providers } from '../shared/schema';
import bcrypt from 'bcryptjs';

async function createProvider(
  subdomain: string,
  name: string,
  email: string,
  businessName: string,
  phone?: string
) {
  try {
    const newProvider = await db.insert(providers).values({
      subdomain,
      name,
      email,
      businessName,
      phone,
      isActive: true
    }).returning();

    console.log(`✅ Provider created successfully:`);
    console.log(`   Subdomain: ${subdomain}.mkashop.online`);
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Business: ${businessName}`);

    return newProvider[0];
  } catch (error) {
    console.error('❌ Error creating provider:', error);
    throw error;
  }
}

// Example usage
async function main() {
  // Create Gesis provider
  await createProvider(
    'gesis',
    'Gesis Admin',
    'admin@gesis.mkashop.online',
    'Gesis Internet Services',
    '+254700000000'
  );

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createProvider };