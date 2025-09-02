#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

class NgrokTunnel {
  constructor() {
    this.ngrokProcess = null;
    this.tunnelUrl = null;
  }

  async checkNgrokInstalled() {
    return new Promise((resolve) => {
      exec('which ngrok', (error, stdout, stderr) => {
        resolve(!error && stdout.trim().length > 0);
      });
    });
  }

  async installNgrok() {
    console.log('📦 Installing ngrok...');
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn('bash', ['-c', `
        curl -L "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz" -o /tmp/ngrok.tgz &&
        tar -xzf /tmp/ngrok.tgz -C /tmp/ &&
        sudo mv /tmp/ngrok /usr/local/bin/ngrok &&
        rm /tmp/ngrok.tgz
      `]);

      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ ngrok installed successfully');
          resolve();
        } else {
          reject(new Error('Failed to install ngrok'));
        }
      });
    });
  }

  async startTunnel(port = 5000) {
    console.log(`🚀 Starting ngrok tunnel on port ${port}...`);
    
    return new Promise((resolve, reject) => {
      // Start ngrok process
      this.ngrokProcess = spawn('ngrok', ['http', port.toString(), '--log', 'stdout']);
      
      let tunnelEstablished = false;
      
      this.ngrokProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Look for the tunnel URL
        const urlMatch = output.match(/url=https:\/\/[a-z0-9\-]+\.ngrok-free\.app/);
        if (urlMatch && !tunnelEstablished) {
          this.tunnelUrl = urlMatch[0].replace('url=', '');
          tunnelEstablished = true;
          
          console.log(`✅ ngrok tunnel active: ${this.tunnelUrl}`);
          console.log(`📲 M-Pesa callback URL: ${this.tunnelUrl}/api/payment/callback`);
          
          // Save the URL to file for the application
          fs.writeFileSync('.ngrok-url', this.tunnelUrl);
          
          resolve(this.tunnelUrl);
        }
      });

      this.ngrokProcess.stderr.on('data', (data) => {
        console.error('ngrok error:', data.toString());
      });

      this.ngrokProcess.on('close', (code) => {
        console.log(`ngrok process exited with code ${code}`);
        if (!tunnelEstablished) {
          reject(new Error('ngrok failed to start'));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!tunnelEstablished) {
          reject(new Error('ngrok tunnel setup timeout'));
        }
      }, 30000);
    });
  }

  async getTunnelInfo() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const tunnels = JSON.parse(data);
            if (tunnels.tunnels && tunnels.tunnels.length > 0) {
              const httpTunnel = tunnels.tunnels.find(t => t.proto === 'https');
              if (httpTunnel) {
                resolve(httpTunnel.public_url);
              } else {
                reject(new Error('No HTTPS tunnel found'));
              }
            } else {
              reject(new Error('No tunnels found'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  stop() {
    if (this.ngrokProcess) {
      console.log('🛑 Stopping ngrok tunnel...');
      this.ngrokProcess.kill();
      this.ngrokProcess = null;
    }
    
    // Clean up the URL file
    try {
      fs.unlinkSync('.ngrok-url');
    } catch (error) {
      // File may not exist, ignore
    }
  }

  async setup() {
    try {
      const hasNgrok = await this.checkNgrokInstalled();
      
      if (!hasNgrok) {
        await this.installNgrok();
      } else {
        console.log('✅ ngrok is already installed');
      }

      const tunnelUrl = await this.startTunnel();
      
      console.log('\n🎉 Ngrok tunnel is ready!');
      console.log(`   📱 Application URL: ${tunnelUrl}`);
      console.log(`   ⚙️  Admin Dashboard: ${tunnelUrl}/admin`);
      console.log(`   💳 M-Pesa will send callbacks to: ${tunnelUrl}/api/payment/callback`);
      console.log('\n💡 Your M-Pesa payments will now work in real-time!');
      
      return tunnelUrl;
    } catch (error) {
      console.error('❌ Failed to setup ngrok tunnel:', error.message);
      throw error;
    }
  }
}

// If called directly
if (require.main === module) {
  const tunnel = new NgrokTunnel();
  
  // Setup cleanup handlers
  process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down ngrok tunnel...');
    tunnel.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    tunnel.stop();
    process.exit(0);
  });

  // Start the tunnel
  tunnel.setup().catch(() => {
    process.exit(1);
  });
}

module.exports = NgrokTunnel;