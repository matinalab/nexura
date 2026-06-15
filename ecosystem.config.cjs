module.exports = {
  apps: [
    {
      name: 'nexura-server',
      script: './dist/apps/server/main.js',
      cwd: '/home/deploy/nexura/server',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
    {
      name: 'nexura-ai',
      script: './dist/apps/ai/main.js',
      cwd: '/home/deploy/nexura/server',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
