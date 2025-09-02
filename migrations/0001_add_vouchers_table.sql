
CREATE TABLE IF NOT EXISTS "vouchers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"plan_id" varchar NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by" varchar,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);

DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_used_by_hotspot_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "hotspot_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "vouchers_code_index" ON "vouchers" ("code");
CREATE INDEX IF NOT EXISTS "vouchers_plan_id_index" ON "vouchers" ("plan_id");
CREATE INDEX IF NOT EXISTS "vouchers_is_used_index" ON "vouchers" ("is_used");
