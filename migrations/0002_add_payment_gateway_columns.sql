
-- Add missing columns to payment_gateways table
ALTER TABLE payment_gateways 
ADD COLUMN IF NOT EXISTS has_auto_api boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_custom_api boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS sandbox_config jsonb,
ADD COLUMN IF NOT EXISTS production_config jsonb,
ADD COLUMN IF NOT EXISTS required_fields jsonb;

-- Update existing records with default values
UPDATE payment_gateways 
SET 
    has_auto_api = true,
    supports_custom_api = true,
    required_fields = '["accountNumber"]'::jsonb
WHERE has_auto_api IS NULL OR supports_custom_api IS NULL;
