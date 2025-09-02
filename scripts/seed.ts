import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import bcrypt from "bcrypt";
import { admins } from "../shared/schema";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await db
    .insert(admins)
    .values({
      username: "admin",
      password: hashedPassword,
      name: "System Admin",
      email: "admin@example.com",
      role: "admin",
    })
    .onConflictDoNothing(); // ✅ prevents duplicate error

  console.log("✅ Admin user ensured in database");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
