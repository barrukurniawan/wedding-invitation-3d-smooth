module.exports = {
  apps: [
    {
      name: 'wedding-summer-api',
      cwd: '/var/www/wedding-summer/current/server',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
