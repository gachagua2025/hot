# Quick Router Fix - Simple Steps

## What's Wrong Right Now? 
Your routers aren't answering when our system tries to talk to them. It's like calling someone but they don't pick up the phone.

**All 3 routers are showing "Connection Timeout" - this means:**
- The router might not be turned on
- The IP address might be wrong  
- The router's special door (API) might be closed

## Let's Fix This Step by Step!

### Step 1: Find Your Real Router (5 minutes)
1. **Open your web browser** (Chrome, Firefox, etc.)
2. **Type these addresses one by one** in the address bar:
   ```
   192.168.88.1
   192.168.1.1
   192.168.0.1
   ```
3. **Look for a page that says "MikroTik"** at the top

**✋ Stop here and tell me: Which address worked?**

### Step 2: Login to Your Router (2 minutes)
When you see the MikroTik page:
1. **Username:** type `admin`
2. **Password:** leave it blank (empty)
3. **Click Login**

If that doesn't work:
1. **Username:** type `admin` 
2. **Password:** type `admin`
3. **Click Login**

**✋ Stop here and tell me: Did you get in?**

### Step 3: Open the Special Door (3 minutes)
This is the most important step! The router needs to open a special door so our payment system can talk to it.

**Inside your router:**
1. **Look at the left side** - you'll see a menu
2. **Click on "IP"**
3. **Click on "Services"**
4. **Find the row that says "api"**
5. **Double-click on that row**
6. **Make sure "Disabled" is NOT checked** (the box should be empty)
7. **Make sure "Port" shows 8728**
8. **Click "OK"**

**✋ Stop here and tell me: Did you find the API service?**

## After You Do These Steps

Once you complete these 3 steps:
1. **Tell me which IP address worked**
2. **Tell me which username/password worked**  
3. **Tell me if you found the API service**

Then I'll update your router in our system and test it again!

## Why This Will Work

Right now your routers are like:
- 🚪 Door is locked (API disabled)
- 📞 Phone is off the hook (wrong IP or router off)
- 🔑 Wrong key (wrong username/password)

After we fix it:
- ✅ Door is open (API enabled)
- ✅ Phone is answered (correct IP)  
- ✅ Right key (correct login)
- ✅ Customers can pay and get internet automatically!

**Don't worry if you get stuck - just tell me which step isn't working and I'll help you through it!**