#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up ngrok for M-Pesa callbacks...');

// First, let's check if ngrok is available
const checkNgrok = () => {
  return new Promise((resolve) => {
    const ngrok = spawn('which', ['ngrok']);
    ngrok.on('close', (code) => {
      resolve(code === 0);
    });
  });
};

// Download and setup ngrok if not available
const setupNgrok = async () => {
  const hasNgrok = await checkNgrok();
  
  if (!hasNgrok) {
    console.log('Downloading ngrok...');
    
    // Download ngrok for Linux
    const download = spawn('curl', [
      '-L',
      'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz',
      '-o',
      '/tmp/ngrok.tgz'
    ]);
    
    download.on('close', (code) => {
      if (code === 0) {
        console.log('Extracting ngrok...');
        const extract = spawn('tar', ['-xzf', '/tmp/ngrok.tgz', '-C', '/tmp/']);
        
        extract.on('close', (extractCode) => {
          if (extractCode === 0) {
            // Move ngrok to a location in PATH
            const move = spawn('sudo', ['mv', '/tmp/ngrok', '/usr/local/bin/ngrok']);
            move.on('close', (moveCode) => {
              if (moveCode === 0) {
                console.log('✓ ngrok installed successfully');
                startNgrokTunnel();
              } else {
                console.error('✗ Failed to install ngrok');
              }
            });
          }
        });
      }
    });
  } else {
    console.log('✓ ngrok is already available');
    startNgrokTunnel();
  }
};

// Start ngrok tunnel
const startNgrokTunnel = () => {
  console.log('Starting ngrok tunnel on port 5000...');
  
  const ngrok = spawn('ngrok', ['http', '5000', '--log', 'stdout']);
  
  ngrok.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Extract the public URL
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/);
    if (urlMatch) {
      const publicUrl = urlMatch[0];
      console.log(`\n✓ ngrok tunnel active: ${publicUrl}`);
      console.log(`✓ M-Pesa callback URL: ${publicUrl}/api/payment/callback\n`);
      
      // Save the URL to a file for the application to use
      fs.writeFileSync('.ngrok-url', publicUrl);
    }
  });
  
  ngrok.stderr.on('data', (data) => {
    console.error('ngrok error:', data.toString());
  });
  
  ngrok.on('close', (code) => {
    console.log(`ngrok process exited with code ${code}`);
  });
};

setupNgrok();