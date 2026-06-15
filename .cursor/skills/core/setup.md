---
triggers:
  - 从零搭建
  - Monorepo 初始化
  - 前后端配置
  - 搭建项目
  - NestJS 初始化
  - Vue3 初始化
  - Vite 配置
  - pnpm workspace
---

# 项目搭建指南

从零搭建 Nexura 项目的完整流程。运行时代码（PrismaService / ResponseService / SharedModule / 拦截器等）见 `core/shared-libs.md`。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS (Monorepo) |
| 数据库 | PostgreSQL + Prisma ORM |
| 文件存储 | MinIO |
| 消息队列 | BullMQ + Redis |
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite |
| UI 库 | Element Plus |
| 状态管理 | Pinia + persistedstate |
| 样式 | Tailwind CSS v4 |
| 包管理 | pnpm workspace |

---

## 一、Monorepo 初始化

### 根目录结构

```
nexura/
├── apps/web/           # Vue3 前端
├── server/             # NestJS 后端（含多应用）
├── packages/
│   ├── common/         # 前后端共享类型
│   └── config/         # 统一端口配置
├── package.json
└── pnpm-workspace.yaml
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'server'
  - 'packages/*'
```

### 根 package.json

```json
{
  "scripts": {
    "web": "pnpm --filter @nexura/web dev",
    "server": "pnpm --filter @nexura/server start:dev",
    "ai": "pnpm --filter @nexura/server start:dev ai",
    "all": "concurrently \"pnpm run web\" \"pnpm run server\""
  },
  "dependencies": {
    "concurrently": "^9.2.1"
  }
}
```

---

## 二、packages 共享包

### packages/config/index.ts

```typescript
export const Config = {
  ports: {
    server: 3000,
    ai: 3001,
    web: 8080,
  },
};
```

`packages/config/package.json`：

```json
{ "name": "@nexura/config", "version": "1.0.0", "main": "index.ts" }
```

### packages/common

按模块拆分类型文件：

```
packages/common/
├── user/index.ts
├── course/index.ts
└── ...
```

`packages/common/package.json`：

```json
{ "name": "@nexura/common", "version": "1.0.0", "main": "index.js" }
```

---

## 三、后端初始化（NestJS Monorepo）

### 1. 创建项目并转 Monorepo

```bash
mkdir server && cd server
nest new . --skip-git --package-manager pnpm

nest g app server
nest g app ai
nest g lib shared
```

### 2. nest-cli.json

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/server/src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "apps/server/tsconfig.app.json"
  },
  "generateOptions": { "spec": false },
  "monorepo": true,
  "root": "apps/server",
  "projects": {
    "server": {
      "type": "application",
      "root": "apps/server",
      "entryFile": "main",
      "sourceRoot": "apps/server/src",
      "compilerOptions": { "tsConfigPath": "apps/server/tsconfig.app.json" }
    },
    "ai": {
      "type": "application",
      "root": "apps/ai",
      "entryFile": "main",
      "sourceRoot": "apps/ai/src",
      "compilerOptions": { "tsConfigPath": "apps/ai/tsconfig.app.json" }
    },
    "shared": {
      "type": "library",
      "root": "libs/shared",
      "entryFile": "index",
      "sourceRoot": "libs/shared/src",
      "compilerOptions": { "tsConfigPath": "libs/shared/tsconfig.lib.json" }
    }
  }
}
```

### 3. tsconfig.json（路径别名）

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "paths": {
      "@libs/shared": ["libs/shared/src"],
      "@libs/shared/*": ["libs/shared/src/*"]
    }
  }
}
```

### 4. 安装后端核心依赖

```bash
pnpm add @nestjs/config @nestjs/jwt @nestjs/platform-express
pnpm add @prisma/client @prisma/adapter-pg
pnpm add @nestjs/bullmq bullmq
pnpm add dotenv minio nodemailer socket.io
pnpm add -D prisma tsx
```

---

## 四、Prisma 初始化

```bash
cd server
npx prisma init
```

### prisma.config.ts

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### schema.prisma 基础配置

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../libs/shared/src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}
```

完整业务 Schema 见 `core/schema.md`。

```bash
pnpm prisma migrate dev --name init
```

---

## 五、共享库结构

`libs/shared/` 的完整实现（PrismaService / ResponseService / AuthGuard / SharedModule / 拦截器等）见 `core/shared-libs.md`。

---

## 六、前端初始化（Vue3 + Vite）

### 1. 创建项目

```bash
cd apps
pnpm create vue@latest web
# 选择：TypeScript Yes / Vue Router Yes / Pinia Yes / 其余 No
```

### 2. 安装前端依赖

```bash
cd apps/web
pnpm add element-plus @element-plus/icons-vue
pnpm add pinia-plugin-persistedstate
pnpm add axios
pnpm add @tailwindcss/vite tailwindcss
pnpm add @nexura/common@workspace:* @nexura/config@workspace:*
```

### 3. vite.config.ts

```typescript
import { fileURLToPath, URL } from 'node:url';
import { Config } from '@nexura/config';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: Config.ports.web,
    proxy: {
      '/api': { target: 'http://localhost:' + Config.ports.server, changeOrigin: true },
      '/ai':  { target: 'http://localhost:' + Config.ports.ai,     changeOrigin: true },
    },
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
```

### 4. main.ts

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(ElementPlus, { locale: zhCn });
app.use(router);
app.mount('#app');
```

### 5. Axios 封装（apis/index.ts）

```typescript
import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { refreshTokenApi } from './auth'
import { ElMessage } from 'element-plus'

export const uploadUrl = import.meta.env.DEV ? 'http://192.168.1.6:9000' : 'http://线上地址待定'
export const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : 'nexura.bbroot.com'
export const timeout = 50000

export const serverApi = axios.create({
    baseURL: '/api/v1',
    timeout,
})

let isRefreshing = false
let requestQueue: ((newAccessToken: string) => void)[] = []

serverApi.interceptors.request.use(config => {
    const userStore = useUserStore()
    if (userStore.getAccessToken) {
        config.headers.Authorization = `Bearer ${userStore.getAccessToken}`
    }
    return config
})

serverApi.interceptors.response.use(res => {
    return res.data
}, async error => {
    if (error.code === "ERR_NETWORK") {
        ElMessage.error('网络连接失败,请重试')
        return Promise.reject(error)
    }
    const status = error.response?.status
    if (status !== 401) {
        ElMessage.error(error.response?.data?.message || '服务器异常,请稍后再试')
        return Promise.reject(error)
    }
    const userStore = useUserStore()
    const accessToken = userStore.getAccessToken
    const refreshToken = userStore.getRefreshToken
    const originalRequest = error.config

    if (!accessToken || !refreshToken) {
        userStore.logout()
        ElMessage.error('登录已过期,请重新登录')
        router.replace('/')
        return Promise.reject(error)
    }

    if (isRefreshing) {
        return new Promise((resolve) => {
            requestQueue.push((newAccessToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                resolve(serverApi(originalRequest))
            })
        })
    }

    isRefreshing = true
    try {
        const newToken = await refreshTokenApi({ refreshToken })
        if (newToken.success) {
            userStore.updateToken(newToken.data)
        } else {
            userStore.logout()
            ElMessage.error('登录已过期,请重新登录')
            router.replace('/')
            return Promise.reject(error)
        }
        const newAccessToken = newToken.data.accessToken
        requestQueue.forEach(callback => callback(newAccessToken))
        return serverApi(originalRequest)
    } catch (error) {
        return Promise.reject(error)
    } finally {
        requestQueue = []
        isRefreshing = false
    }
})

export const aiApi = axios.create({
    baseURL: '/ai/v1',
    timeout,
})
aiApi.interceptors.response.use(res => res.data)

export interface Response<T = any> {
    timestamp: string;
    path: string;
    message: string;
    code: number;
    success: boolean;
    data: T;
}
```

关键设计：
- `refreshTokenApi` 使用独立 axios 实例，不走 `serverApi` 拦截器，防止刷新 token 接口本身 401 导致死循环
- 多个请求同时 401 时，只触发一次刷新，其余请求进入队列挂起等待

### 6. Token 刷新接口（apis/auth/index.ts）

```typescript
import axios from 'axios'
import type { Token } from '@nexura/common/user'
import type { Response } from '../index'

const refreshServer = axios.create({
    baseURL: '/api/v1',
    timeout: 50000,
})
refreshServer.interceptors.response.use(res => res.data)

export const refreshTokenApi = (data: Omit<Token, 'accessToken'>) =>
    refreshServer.post('/user/refresh-token', data) as Promise<Response<Token>>
```

### 7. User Store（stores/user.ts）

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { WebResultUser, Token, UserUpdate } from '@nexura/common/user'

export const useUserStore = defineStore('user', () => {
  const user = ref<WebResultUser | null>(null)

  const setUser = (params: WebResultUser) => { user.value = params }
  const getAccessToken = computed(() => user.value?.token.accessToken)
  const getRefreshToken = computed(() => user.value?.token.refreshToken)

  const updateToken = (newToken: Token) => { user.value!.token = newToken }
  const updateUserWordNumber = (wordNumber: number) => { user.value!.wordNumber = wordNumber }

  const updateUser = (params: UserUpdate) => {
    user.value!.name = params.name
    user.value!.email = params.email
    user.value!.address = params.address
    user.value!.avatar = params.avatar
    user.value!.bio = params.bio
    user.value!.isTimingTask = params.isTimingTask
    user.value!.timingTaskTime = params.timingTaskTime
  }

  const getUpdateUserInfo = computed<UserUpdate>(() => ({
    name: user.value!.name,
    email: user.value!.email,
    address: user.value!.address,
    avatar: user.value!.avatar,
    bio: user.value!.bio,
    isTimingTask: user.value!.isTimingTask,
    timingTaskTime: user.value!.timingTaskTime,
  }))

  const getUser = computed(() => user.value)
  const logout = () => { user.value = null }

  return {
    user, setUser, getUser, logout,
    getAccessToken, getRefreshToken, updateToken,
    updateUser, getUpdateUserInfo, updateUserWordNumber
  }
}, { persist: true })
```

### 8. App.vue

```vue
<template>
  <RouterView />
  <Search />
  <Login />
</template>

<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { IS_SHOW_LOGIN } from './components/Login/type'
import { useSocket } from './hooks/useSocket'
import { useUserStore } from './stores/user'
import { Tracker } from '@nexura/tracker'

provide(IS_SHOW_LOGIN, ref(false))

const tracker = new Tracker({
    baseUrl: '/api/v1',
    uv: { api: '/tracker/uv', updateApi: '/tracker/update-uv' },
    pv: { api: '/tracker/pv' },
    event: { api: '/tracker/event' },
    error: { api: '/tracker/error' },
    performance: { api: '/tracker/performance' },
})

const userStore = useUserStore()
const { connect, disconnect } = useSocket()

watch(() => userStore.user?.id, (newVal) => {
  if (newVal) {
    tracker.setUserId(newVal)
    connect()
  } else {
    disconnect()
  }
}, { immediate: true })
</script>
```

App.vue 启动时完成：
1. `provide(IS_SHOW_LOGIN)` — 全局注入登录弹窗状态（供 `useLogin` hook 使用）
2. 初始化 Tracker SDK
3. 监听用户登录状态，登录后关联 userId 并建立 WebSocket，退出后断开

### 9. 前端路由入口（router/index.ts）

```typescript
import home from './home/index'
import wordBook from './word-book/index'
import setting from './setting/index'
import chat from './chat/index'
import course from './course/index'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...home, ...wordBook, ...setting, ...chat, ...course]
})
```

路由鉴权不通过路由守卫实现，而是通过 Header 的 `isAuth` 配置 + `useLogin` hook 实现，详见 `core/frontend-advanced.md`。

---

## 七、环境变量

`server/.env`（完整清单见 `core/shared-libs.md`）：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nexura"
SECRET_KEY="your-secret-key"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL=0
MINIO_BUCKET="avatar"
REDIS_HOST="localhost"
REDIS_PORT=6379
```

---

## 八、常用命令

```bash
# 启动全部服务（根目录）
pnpm all

# 单独启动
pnpm web      # 前端 :8080
pnpm server   # 后端 :3000

# Prisma
pnpm prisma migrate dev --name xxx
pnpm prisma studio
pnpm prisma migrate reset

# NestJS CLI（在 server/ 目录下）
nest g module xxx
nest g controller xxx
nest g service xxx
```
