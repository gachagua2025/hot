#!/usr/bin/env node

/**
 * Simple Router Connection Test
 * This helps you test if your MikroTik router is set up correctly
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAllRouters() {
  console.log('🔍 Testing All Configured Routers\n');

  try {
    // Get all routers
    const routersResponse = await makeRequest('GET', '/api/admin/routers');
    
    if (routersResponse.status !== 200) {
      console.log('❌ Could not get router list');
      return;
    }

    const routers = routersResponse.data;
    console.log(`Found ${routers.length} routers in the system:\n`);

    for (const router of routers) {
      console.log(`📡 Testing: ${router.name} (${router.host}:${router.port})`);
      console.log(`   Username: ${router.username}`);
      console.log(`   Status: ${router.isActive ? 'Active' : 'Inactive'}`);
      
      // Test connection
      console.log('   Testing connection...');
      const testResponse = await makeRequest('POST', `/api/admin/routers/${router.id}/test`);
      
      if (testResponse.status === 200 && testResponse.data.success) {
        console.log('   ✅ Connection SUCCESS!');
        console.log('   📶 Router is responding and ready to use\n');
      } else {
        console.log('   ❌ Connection FAILED');
        console.log('   🔧 Check these things:');
        console.log('      - Is the router turned on?');
        console.log('      - Is the IP address correct?');
        console.log('      - Is the API service enabled?');
        console.log('      - Are the username/password correct?\n');
      }
    }

  } catch (error) {
    console.log('❌ Error testing routers:', error.message);
  }
}

async function addNewRouter() {
  console.log('➕ Adding a New Router\n');
  
  // Example of how to add a router
  const newRouter = {
    name: "Test Router",
    host: "192.168.88.1",
    port: 8728,
    username: "admin",
    password: "",
    isActive: true
  };

  try {
    console.log('Adding router with these settings:');
    console.log(`   Name: ${newRouter.name}`);
    console.log(`   IP: ${newRouter.host}`);
    console.log(`   Port: ${newRouter.port}`);
    console.log(`   Username: ${newRouter.username}`);
    
    const response = await makeRequest('POST', '/api/admin/routers', newRouter);
    
    if (response.status === 201) {
      console.log('✅ Router added successfully!');
      if (response.data.connectionTest) {
        console.log('✅ Connection test passed!');
      } else {
        console.log('❌ Connection test failed - check router settings');
      }
    } else {
      console.log('❌ Failed to add router:', response.data.message);
    }
    
  } catch (error) {
    console.log('❌ Error adding router:', error.message);
  }
}

async function networkScan() {
  console.log('🔍 Scanning Network for MikroTik Routers\n');
  
  try {
    console.log('Scanning... this might take a moment...');
    const response = await makeRequest('POST', '/api/admin/routers/scan-network');
    
    if (response.status === 200) {
      console.log(`✅ Scan complete!`);
      console.log(`Found ${response.data.routers?.length || 0} MikroTik routers:`);
      
      if (response.data.routers) {
        response.data.routers.forEach((router, index) => {
          console.log(`   ${index + 1}. ${router.name} at ${router.host}:${router.port}`);
        });
      }
    } else {
      console.log('❌ Network scan failed');
    }
    
  } catch (error) {
    console.log('❌ Error during network scan:', error.message);
  }
}

// Main function
(async () => {
  console.log('🛠️  MikroTik Router Testing Tool\n');
  console.log('This tool helps you test your router connections\n');
  
  await testAllRouters();
  
  console.log('💡 Tips:');
  console.log('   - Make sure your router has API enabled');
  console.log('   - Check that port 8728 is not blocked');
  console.log('   - Verify username and password are correct');
  console.log('   - Router and this system should be on same network\n');
})();

export { testAllRouters, addNewRouter, networkScan };