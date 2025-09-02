CREATE TABLE "admins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username"),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "hotspot_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mac_address" text NOT NULL,
	"phone_number" text,
	"plan_id" varchar,
	"router_id" varchar,
	"username" text,
	"password" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"bytes_uploaded" integer DEFAULT 0,
	"bytes_downloaded" integer DEFAULT 0,
	"session_time" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotspot_users_mac_address_unique" UNIQUE("mac_address")
);
--> statement-breakpoint
CREATE TABLE "mikrotik_routers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 8728 NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"routeros_version" text DEFAULT '7.x' NOT NULL,
	"connection_type" text DEFAULT 'direct' NOT NULL,
	"ovpn_server_host" text,
	"ovpn_server_port" integer DEFAULT 1194,
	"ovpn_username" text,
	"ovpn_password" text,
	"ovpn_certificate" text,
	"ovpn_private_key" text,
	"ovpn_ca_file" text,
	"ovpn_tunnel_ip" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mpesa_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_request_id" text,
	"merchant_request_id" text,
	"phone_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"plan_id" varchar,
	"user_id" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"mpesa_receipt_number" text,
	"transaction_date" timestamp,
	"callback_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mpesa_transactions_checkout_request_id_unique" UNIQUE("checkout_request_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration_hours" integer NOT NULL,
	"speed_mbps" integer NOT NULL,
	"data_limit_gb" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"router_id" varchar,
	"session_id" text,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"bytes_uploaded" integer DEFAULT 0,
	"bytes_downloaded" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotspot_users" ADD CONSTRAINT "hotspot_users_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotspot_users" ADD CONSTRAINT "hotspot_users_router_id_mikrotik_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."mikrotik_routers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mpesa_transactions" ADD CONSTRAINT "mpesa_transactions_user_id_hotspot_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hotspot_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_hotspot_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hotspot_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_router_id_mikrotik_routers_id_fk" FOREIGN KEY ("router_id") REFERENCES "public"."mikrotik_routers"("id") ON DELETE no action ON UPDATE no action;