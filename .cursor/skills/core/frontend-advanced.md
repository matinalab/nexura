---
triggers:
  - 登录弹窗
  - Layout
  - Hooks
  - Socket 前端
  - WebSocket 前端
  - NestJS WebSocket Gateway
  - Socket 后端
  - useLogin
  - provide inject
  - 路由鉴权
---

# 前端进阶

本文档补充前端的高级实现，包括全局登录弹窗机制、Layout 系统、Hooks 等。

Axios 封装、Token 刷新接口、User Store、App.vue、路由入口等基础搭建内容见 `core/setup.md` 六、前端初始化。

---

## 全局登录弹窗机制

### 设计原理

使用 `provide/inject` + `Symbol` 实现全局登录弹窗控制，任何组件都可以触发登录。

### 1. 定义注入 Key

`components/Login/type.ts`:

```typescript
export const IS_SHOW_LOGIN = Symbol('IS_SHOW_LOGIN')
export type LoginType = 'login' | 'register'
```

### 2. App.vue 提供注入

在 App.vue 中 `provide(IS_SHOW_LOGIN, ref(false))`，详见 `core/setup.md` 六、8. App.vue。

### 3. useLogin Hook

```typescript
import { IS_SHOW_LOGIN } from '@/components/Login/type'
import { inject, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import router from '@/router'

export const useLogin = () => {
    const isShowLogin = inject(IS_SHOW_LOGIN, ref(false))
    const userStore = useUserStore()

    const login = () => {
        return new Promise((resolve, reject) => {
            if (userStore.getUser) {
                resolve(true)
            } else {
                isShowLogin.value = true
                reject(false)
            }
        })
    }

    const logout = () => {
        userStore.logout()
        router.push('/')
    }

    const hide = () => {
        isShowLogin.value = false
    }

    return { login, hide, logout }
}
```

### 4. 在需要鉴权的地方调用

```typescript
const { login } = useLogin()

const gotoProtectedPage = async () => {
    await login()  // 未登录则弹窗，已登录直接通过
    router.push('/setting/index')
}
```

---

## Layout 系统

### 结构

```
layout/
├── index.vue       → 入口：Header + Content
├── Header/index.vue → 顶部导航栏
├── Content/index.vue → RouterView 渲染区域
└── Profile/index.vue → 用户资料卡（Popover）
```

### layout/index.vue

```vue
<template>
    <Header />
    <Content />
</template>
<script setup lang="ts">
import Header from './Header/index.vue'
import Content from './Content/index.vue'
</script>
```

### layout/Content/index.vue

```vue
<template>
    <RouterView />
</template>
<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>
```

### Header 导航

导航路由配置在 Header 中硬编码，包含是否需要鉴权：

```typescript
const routes = [
    { path: '/', name: '主页', icon: HomeFilled, isAuth: false },
    { path: '/chat/index', name: 'AI', icon: MagicStick, isAuth: true },
    { path: '/word-book/index', name: '词库', icon: Notebook, isAuth: false },
    { path: '/courses/index', name: '课程', icon: Reading, isAuth: false },
    { path: '/setting/index', name: '设置', icon: Setting, isAuth: true },
]
```

路由跳转前检查鉴权：

```typescript
const gotoPath = async (path: string) => {
    const isAuth = routes.find(route => route.path === path)?.isAuth ?? false
    if (isAuth) {
        await login()
        if (userStore.getUser) {
            router.push(path)
        }
    } else {
        router.push(path)
    }
}
```

Header 还显示：
- 用户 wordNumber（单词数量徽章）
- 用户 dayNumber（打卡天数徽章）
- 头像 + Popover 弹出 Profile 卡片

---

## Hooks

### useAvatar

处理头像 URL 拼接和默认头像：

```typescript
import { uploadUrl } from '@/apis'
import defaultAvatar from '@/assets/images/avatar/default-avatar.png'
import { useUserStore } from '@/stores/user'
import { computed } from 'vue'

export const useAvatar = () => {
    const userStore = useUserStore()

    const avatar = computed(() => {
        if (userStore.getUser?.avatar) {
            return uploadUrl + userStore.getUser.avatar
        }
        return defaultAvatar
    })

    const customAvatar = (avatar: string) => {
        return avatar ? uploadUrl + avatar : defaultAvatar
    }

    return { avatar, customAvatar }
}
```

### useSocket

管理 Socket.IO 连接生命周期：

```typescript
import { io, type Socket } from 'socket.io-client'
import { socketUrl } from '@/apis'
import { useUserStore } from '@/stores/user'

let socket: Socket | null = null

export const useSocket = () => {
    const userStore = useUserStore()

    const connect = () => {
        const userId = userStore.user?.id
        if (!userId || socket) return

        socket = io(socketUrl, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            query: { userId }
        })

        if (import.meta.hot) {
            import.meta.hot.data.socket = socket
        }
    }

    const disconnect = () => {
        if (socket) {
            socket.disconnect()
            socket.removeAllListeners()
            socket = null
            if (import.meta.hot) {
                import.meta.hot.data.socket = null
            }
        }
    }

    const getSocket = (): Socket | null => {
        return socket ?? (import.meta.hot?.data.socket ?? null)
    }

    return { connect, disconnect, getSocket }
}
```

**HMR 兼容**：通过 `import.meta.hot.data` 在热更新时保持 socket 引用不丢失。

---

## 登录组件结构

```
components/Login/
├── index.vue         → 弹窗容器（遮罩 + 左右分栏）
├── LoginForm.vue     → 手机号+密码登录表单
├── RegisterForm.vue  → 注册表单
├── ModelViewer.vue   → 左侧 3D 模型展示
└── type.ts           → IS_SHOW_LOGIN Symbol + LoginType
```

弹窗特性：
- `provide/inject` 控制显示隐藏
- ESC 键关闭
- 左侧 3D 模型可切换 login/register 模式
- `<Transition>` 淡入淡出动画
