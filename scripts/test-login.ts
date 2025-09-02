import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import bcrypt from "bcrypt";
import { admins } from "../shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function testLogin(username: string, password: string) {
  // Find admin by username
  const [user] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username));

  if (!user) {
    console.log("❌ User not found");
    return;
  }

  // Compare entered password with stored hash
  const isValid = await bcrypt.compare(password, user.password);

  if (isValid) {
    console.log(`✅ Login success for ${username}`);
  } else {
    console.log("❌ Invalid password");
  }
}

testLogin("admin", "admin123") // <-- test correct password
  .then(() => testLogin("admin", "wrongpass")) // <-- test wrong password
  .finally(() => pool.end());
