module.exports = {
  apps: [
    {
      name: 'nexura-server',
      script: './server/dist/apps/server/apps/server/src/main.js',
      cwd: '/home/deploy/nexura',
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
      script: './server/dist/apps/ai/apps/ai/src/main.js',
      cwd: '/home/deploy/nexura',
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
