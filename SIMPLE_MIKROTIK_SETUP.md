# MikroTik Router Setup - Simple Guide

## What We're Doing
Think of your MikroTik router like a smart guard at the door of your WiFi. We need to teach it to:
1. Let people connect to WiFi
2. Ask them to pay before using internet
3. Give them internet after they pay

## Step 1: Find Your Router
First, we need to find your MikroTik router on your network.

**Easy Way to Find It:**
1. Open your web browser
2. Try these addresses (one at a time):
   - `http://192.168.88.1`
   - `http://192.168.1.1` 
   - `http://192.168.0.1`
3. If you see a MikroTik login page, that's your router!

**What IP Address Did You Find?** Write it down: ________________

## Step 2: Login to Your Router
1. When you see the login page, try these passwords:
   - Username: `admin`  Password: (leave empty)
   - Username: `admin`  Password: `admin`
   - Username: `admin`  Password: `password`

**Which one worked?** Write it down: ________________

## Step 3: Enable the Special Door (API)
The router needs a special door so our payment system can talk to it.

**In your router's web interface:**
1. Click on "IP" in the left menu
2. Click on "Services" 
3. Find the row that says "api"
4. Double-click on it
5. Make sure "Disabled" is NOT checked (the box should be empty)
6. Make sure "Port" says `8728`
7. Click "OK"

## Step 4: Create a Special User (Optional but Recommended)
This is like giving our payment system its own key to the router.

**In your router:**
1. Click "System" in the left menu
2. Click "Users"
3. Click the "+" button to add new user
4. Fill in:
   - Name: `hotspot-api`
   - Password: `VPS2025API!`
   - Group: `full`
5. Click "OK"

## Step 5: Set Up Hotspot (If Not Done)
This creates the WiFi that customers will connect to.

**In your router:**
1. Click "IP" in the left menu
2. Click "Hotspot" 
3. If you see "Hotspot Setup" button, click it
4. Click "Next" through all the steps (the defaults are usually fine)
5. When it asks for a name, use something like "MyWiFi-Hotspot"

## Step 6: Add Your Router to Our System
Now we tell our payment system about your router.

**Your Router Information:**
- IP Address: ________________ (from Step 1)
- Port: `8728`
- Username: `hotspot-api` (if you created it) or `admin`
- Password: `VPS2025API!` (if you created special user) or whatever worked in Step 2

## Testing Your Setup

Once you've done these steps, we can test if everything works:

1. Your router should appear in the admin dashboard
2. The connection test should show "Success"
3. When customers pay, they should automatically get internet access

## Common Problems and Solutions

**Problem: Can't find router IP address**
- Try using WiFi scanner apps on your phone
- Check your computer's network settings
- Ask someone who set up your internet

**Problem: Can't login to router**
- Try resetting the router (hold reset button for 10 seconds)
- Default login is usually admin with no password

**Problem: API service won't start**
- Make sure you're using the web interface, not mobile app
- Try restarting the router after enabling API

**Problem: Connection test fails**
- Double-check the IP address
- Make sure the router and payment system are on same network
- Check if firewall is blocking port 8728

## What Happens Next?

After setup:
1. Customers connect to your WiFi
2. They see a page asking them to choose a plan
3. They pay with M-Pesa
4. They automatically get internet access
5. You get paid and can track everything in the admin dashboard

Need help with any step? Let me know which step you're stuck on!