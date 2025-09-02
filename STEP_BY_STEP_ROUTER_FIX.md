# Fix Your MikroTik Router - Step by Step

## What's Happening Now?
I can see you have 3 routers in the system, but they can't connect. It's like having the wrong key for a door.

**Your Current Routers:**
1. **Main Router** - `192.168.88.1`
2. **Office Router** - `192.168.1.1` 
3. **testi** - `hhb0aba4a5b.sn.mynetname.net`

## Why They're Not Working
The error `errno: -110` means "connection timeout" - like knocking on a door but nobody answers.

## Let's Fix This Together!

### Step 1: Find Your Real Router
**What you need to do:**
1. Open your web browser
2. Try typing these addresses in the address bar:
   - `192.168.88.1`
   - `192.168.1.1`
   - `192.168.0.1`
   - Your WiFi router's address (check the sticker on your router)

**Question for you:** Which address shows a MikroTik login page?
Write it here: _______________

### Step 2: Login to Your Router
When you see the MikroTik page:
1. Try username: `admin` and leave password blank
2. If that doesn't work, try username: `admin` password: `admin`

**Question for you:** Did you get logged in? Yes/No: _______

### Step 3: Enable the API (Very Important!)
This is like opening a special door so our payment system can talk to your router.

**In your router's web page:**
1. Look for a menu on the left side
2. Click on "IP"
3. Click on "Services"
4. Find the line that says "api"
5. Double-click on it
6. Make sure there's NO checkmark in "Disabled"
7. Make sure "Port" shows `8728`
8. Click "OK"

**Question for you:** Did you see the API service? Yes/No: _______

### Step 4: Check Your Network
Your router and our payment system need to be on the same network (like being in the same building).

**Quick test:**
1. On your computer, press Windows key + R
2. Type `cmd` and press Enter
3. Type: `ping 192.168.88.1` (or whatever IP you found)
4. Press Enter

**Question for you:** Do you see replies? Yes/No: _______

### Step 5: Create a Special User (Recommended)
This gives our system its own key to your router.

**In your router:**
1. Click "System" in the left menu
2. Click "Users"
3. Click the "+" button (add new)
4. Fill in:
   - Name: `hotspot-api`
   - Password: `VPS2025API!`
   - Group: `full`
5. Click "OK"

### Step 6: Update Router in Our System
Once you've done the above steps, tell me:
1. What IP address worked? _______________
2. What username/password worked? _______________

Then I'll update your router settings and test the connection!

## Common Issues and Quick Fixes

**Problem: No MikroTik page appears**
- Check if it's really a MikroTik router (look for MikroTik label)
- Try connecting directly with ethernet cable
- Router might be using different IP address

**Problem: Can't login**
- Try holding reset button for 10 seconds to reset router
- Check router manual for default password

**Problem: Can't find API service**
- Make sure you're in the right router interface
- Some older routers might not have API

**Problem: Ping doesn't work**
- Router and computer might be on different networks
- Firewall might be blocking connection

## What Happens After We Fix This?

Once your router is properly connected:
1. ✅ Connection tests will show "Success"
2. ✅ When customers pay, they'll automatically get internet
3. ✅ You can see all activity in the admin dashboard
4. ✅ Money flows directly to your M-Pesa account

Let me know which step you're stuck on and I'll help you through it!