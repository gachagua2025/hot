
# Domain Setup Instructions for mkashop.online

## Step 1: Configure DNS Records

In your domain registrar's DNS management:

### A Records (Point to Replit)
- Host: @ (main domain) → Points to Replit IP
- Host: gesis → Points to Replit IP  
- Host: * (wildcard) → Points to Replit IP

### CNAME Records (Alternative)
- Host: gesis → Points to your-repl-name.replit.app
- Host: provider2 → Points to your-repl-name.replit.app

## Step 2: Provider Subdomain Examples

1. **Main Site**: mkashop.online
2. **Gesis Provider**: gesis.mkashop.online
3. **Provider2**: provider2.mkashop.online

## Step 3: Test Subdomains

After DNS propagation:
- Visit gesis.mkashop.online - should load with Gesis branding
- Admin login: gesis.mkashop.online/admin
- Each provider gets isolated data and settings

## Step 4: Provider Registration

Each new provider needs:
1. Unique subdomain (e.g., "newprovider")
2. Business details and M-Pesa credentials
3. Router configuration for their network
4. Custom branding (optional)
