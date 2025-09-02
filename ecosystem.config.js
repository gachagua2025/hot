module.exports = {
  apps: [{
    name: 'hotspot-system',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 'max',
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
    merge_logs: true
  }],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/hotspot-system.git',
      path: '/var/www/hotspot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && node package-scripts/production-setup.js && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};