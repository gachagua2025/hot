
-- Add subdomain column to providers table
ALTER TABLE providers ADD COLUMN subdomain VARCHAR(50) UNIQUE;

-- Update existing provider with main subdomain
UPDATE providers SET subdomain = 'main' WHERE subdomain IS NULL;

-- Create index for faster subdomain lookups
CREATE INDEX idx_providers_subdomain ON providers(subdomain);
