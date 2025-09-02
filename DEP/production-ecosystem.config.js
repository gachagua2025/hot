module.exports = {
  apps: [{
    name: 'mkashop-hotspot',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 4, // Use 4 instances for better performance
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Advanced PM2 settings for production
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
    
    // Environment variables for production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      PM2_SERVE_PATH: '/var/www/hotspot/dist',
      PM2_SERVE_PORT: 3000,
      PM2_SERVE_SPA: 'true',
      PM2_SERVE_HOMEPAGE: '/index.html'
    }
  }],

  deploy: {
    production: {
      user: 'ubuntu',
      host: '13.60.237.52',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/hotspot-system.git',
      path: '/var/www/hotspot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'sudo mkdir -p /var/www/hotspot && sudo chown ubuntu:ubuntu /var/www/hotspot'
    }
  }
};