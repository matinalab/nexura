---
triggers:
  - 部署
  - 上线
  - nginx
  - 构建
  - 生产环境
  - PM2
  - Docker
  - 进程管理
  - HTTPS
  - 服务器
---

# 部署指南

Nexura 项目生产环境部署流程，覆盖构建、进程管理、nginx 反向代理、数据库迁移、Docker 可选方案。

项目结构说明：
- `server/apps/server` → 主服务，端口 **3000**
- `server/apps/ai` → AI 服务，端口 **3001**
- `apps/web` → 前端，由 nginx 静态托管
- `apps/tracker` → 埋点 SDK，构建后供前端使用

---

## 一、服务器环境准备

> 以下命令均在 Linux 服务器（Ubuntu/Debian）上执行，**不是本地 Windows 机器**。

### 必装软件

```bash
# Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本（需满足 ^20.19.0 || >=22.12.0）
node -v

# pnpm（项目使用 pnpm workspace）
npm install -g pnpm

# PM2（进程管理）
npm install -g pm2

# nginx
sudo apt install -y nginx

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Redis（BullMQ 队列依赖，digest 定时任务必须）
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# MinIO（二进制方式）
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio && sudo mv minio /usr/local/bin/
```

---

## 二、数据库初始化

```bash
sudo -u postgres psql
CREATE DATABASE nexura;
CREATE USER nexura_user WITH ENCRYPTED PASSWORD '123456';
GRANT ALL PRIVILEGES ON DATABASE nexura TO nexura_user;
\q
```

---

## 三、MinIO 生产配置

MinIO 必须在 seed 之前启动好，因为 seed 脚本会上传课程封面图到 MinIO。

```bash
sudo mkdir -p /data/minio
sudo vim /etc/systemd/system/minio.service
```

```ini
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Environment="MINIO_ROOT_USER=your_access_key"
Environment="MINIO_ROOT_PASSWORD=your_secret_key"
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable minio
sudo systemctl start minio
```

---

## 四、代码部署

### 1. 拉取代码

```bash
git clone https://github.com/matinalab/nexura /home/deploy/nexura
cd /home/deploy/nexura
```

### 2. 安装依赖

**必须在项目根目录**执行，pnpm workspace 会同时安装所有子包依赖：

```bash
# 根目录安装，覆盖 server / apps/web / packages/* 所有依赖
pnpm install
```

### 3. 配置生产环境变量

```bash
cp server/.env.example server/.env
vim server/.env
```

完整配置项（server 和 ai 共用同一个 `.env`）：

```env
# 数据库
DATABASE_URL="postgresql://nexura_user:123456@localhost:5432/nexura"

# JWT
SECRET_KEY="换成随机的长字符串，不能用开发环境的值"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_USE_SSL=0
MINIO_ACCESS_KEY="your_access_key"
MINIO_SECRET_KEY="your_secret_key"

# Redis（BullMQ 依赖，AI digest 定时任务必须配置）
REDIS_HOST="localhost"
REDIS_PORT=6379

# DeepSeek（AI 服务必须，缺少则 ai 应用启动失败）
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxx"
DEEPSEEK_API_MODEL="deepseek-chat"

# 邮件（digest 定时任务发送摘要邮件）
MAIL_HOST="smtp.example.com"
MAIL_PORT=465
MAIL_USER="no-reply@example.com"
MAIL_PASS="your_email_password"

# 支付宝（生产环境用正式网关）
ALIPAY_APP_ID="your_app_id"
ALIPAY_GATEWAY="https://openapi.alipay.com/gateway.do"
ALIPAY_NOTIFY_URL="https://your-domain.com/api/v1/pay/notify"
ALIPAY_PRIVATE_KEY="your_private_key"
ALIPAY_PUBLIC_KEY="alipay_public_key"
```

### 4. 执行数据库迁移

```bash
cd /home/deploy/nexura/server
pnpm prisma migrate deploy
```

`migrate deploy` 只执行未应用的迁移，不生成新文件，适合生产环境（与 `migrate dev` 的区别）。

### 5. 初始化种子数据

**首次部署必须执行**，seed 脚本会：
1. 在 MinIO 创建 `course` 桶并设置公开读权限
2. 上传 8 张课程封面图（`prisma/assets/*.png`）
3. 向数据库写入 8 条课程记录

```bash
cd /home/deploy/nexura/server
pnpm prisma db seed
```

更新部署时如果课程数据已存在，跳过此步。

### 6. 构建后端

```bash
cd /home/deploy/nexura/server

# 构建主服务 → dist/apps/server/main.js
pnpm exec nest build server

# 构建 AI 服务 → dist/apps/ai/main.js
pnpm exec nest build ai
```

或通过 pnpm script：

```bash
pnpm build           # 只构建 server（默认）
pnpm build ai        # 构建 ai（需在 nest-cli.json 中已配置 ai project）
```

### 7. 构建前端

前端 `build` 脚本同时执行 `vue-tsc` 类型检查和 `vite build`，需要 node >= 20.19.0：

```bash
cd /home/deploy/nexura/apps/tracker
pnpm build
```
```bash
cd /home/deploy/nexura/apps/web
pnpm build
```

构建产物在 `apps/web/dist/`，由 nginx 静态托管。

---

## 五、PM2 进程管理

在项目根目录创建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      name: 'nexura-server',
      script: './server/dist/apps/server/main.js',
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
      script: './server/dist/apps/ai/main.js',
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
```

```bash
# 启动所有服务
pm2 start ecosystem.config.cjs

# 查看状态
pm2 list
pm2 logs nexura-server
pm2 logs nexura-ai

# 重启
pm2 restart nexura-server
pm2 restart nexura-ai

# 开机自启（执行后按提示复制粘贴那条 sudo env 命令）
pm2 save
pm2 startup
```

---

## 六、nginx 配置

`/etc/nginx/sites-available/nexura`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 头像上传限制与 user.service 的 5MB 保持一致
    client_max_body_size 10m;

    # 前端静态文件
    location / {
        root /home/deploy/nexura/apps/web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 主服务 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # AI 服务代理（流式 SSE 响应，必须关闭缓冲）
    location /ai/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # WebSocket 代理（支付成功推送）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # MinIO 文件访问（课程封面图 / 用户头像）
    location /course/ {
        proxy_pass http://127.0.0.1:9000/course/;
        proxy_set_header Host $http_host;
    }

    location /user/ {
        proxy_pass http://127.0.0.1:9000/user/;
        proxy_set_header Host $http_host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nexura /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS（Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

certbot 会自动修改 nginx 配置并添加 SSL，证书自动续期。

---

## 七、更新部署流程

每次发布新版本的标准流程：

```bash
cd /home/deploy/nexura

# 1. 拉取最新代码
git pull origin main

# 2. 安装新依赖（根目录）
pnpm install

# 3. 执行新迁移（如有）
cd server && pnpm prisma migrate deploy && cd ..

# 4. 重新构建后端
cd server && nest build server && nest build ai && cd ..

# 5. 重新构建前端
cd apps/web && pnpm build && cd ../..

# 6. 重启后端服务（前端由 nginx 托管，无需重启）
pm2 restart nexura-server
pm2 restart nexura-ai
```

---

## 八、Docker 方案（可选）

适合需要容器化部署的场景。根目录 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: nexura
      POSTGRES_USER: nexura_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    env_file: ./server/.env
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - minio

  ai:
    build:
      context: ./server
      dockerfile: Dockerfile.ai
    env_file: ./server/.env
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  minio_data:
```

`server/Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN nest build server
CMD ["node", "dist/apps/server/main.js"]
```

`server/Dockerfile.ai`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN nest build ai
CMD ["node", "dist/apps/ai/main.js"]
```

---

## 九、常见部署问题

### curl 在 Windows PowerShell 报错

部署命令针对 Linux 服务器，需先 SSH 到服务器再执行：

```bash
ssh root@your-server-ip
```

在本地安装 Node.js 请直接去 [nodejs.org](https://nodejs.org) 下载安装包。

### AI 服务启动失败

最常见原因是 `.env` 缺少 `DEEPSEEK_API_KEY` 或 `REDIS_HOST`，检查：

```bash
pm2 logs nexura-ai --lines 50
```

### seed 上传失败

确认 MinIO 已启动且 `.env` 中的 `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` 与 systemd service 里的 `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` 一致。

### 端口被占用

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### PM2 日志路径

```bash
pm2 logs               # 实时日志
pm2 logs --lines 200   # 最近 200 行
~/.pm2/logs/           # 日志文件目录
```

### 迁移失败回滚

```bash
cd server
pnpm prisma migrate resolve --rolled-back "迁移名称"
```

### nginx 502 Bad Gateway

后端服务未启动：

```bash
pm2 list
pm2 restart all
```

### 静态资源 / 页面刷新 404

Vue Router 使用 history 模式，nginx 必须配置 `try_files $uri $uri/ /index.html`，否则刷新会 404。

### MinIO 图片无法访问

检查 MinIO `course` 桶的 bucket policy 是否为公开读。seed 脚本会自动设置，但手动创建桶时需要在 MinIO Console（:9001）或用 mc 命令设置：

```bash
mc alias set local http://localhost:9000 your_access_key your_secret_key
mc anonymous set public local/course
mc anonymous set public local/user
```
