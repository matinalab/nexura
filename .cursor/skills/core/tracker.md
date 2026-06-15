---
triggers:
  - 埋点 SDK
  - UV
  - PV
  - 点击事件
  - 错误采集
  - 性能监控
  - 用户行为追踪
  - Tracker
  - 埋点
---

# Tracker SDK 开发指南

本文档说明如何开发和集成 `apps/tracker` 埋点 SDK，包括 SDK 结构、各模块实现、构建配置和接入方式。

---

## SDK 概述

`apps/tracker` 是一个独立的前端埋点 SDK，以 npm 包形式发布（`@nexura/tracker`），供 `apps/web` 或其他项目引用。

功能模块：

| 模块 | 文件 | 说明 |
|------|------|------|
| UV（独立访客） | `src/uv/index.ts` | 设备指纹 + 用户识别 |
| PV（页面访问） | `src/pv/index.ts` | 路由监听 + 页面上报 |
| Event（行为事件） | `src/event/index.ts` | 点击事件采集 |
| Error（错误监控） | `src/error/index.ts` | JS 错误 + Promise 错误 |
| Performance（性能） | `src/performance/index.ts` | Web Vitals 指标采集 |
| Report（上报） | `src/report/index.ts` | 发送数据到后端 |

---

## 目录结构

```
apps/tracker/
├── src/
│   ├── uv/index.ts          # UV 访客识别
│   ├── pv/index.ts          # PV 页面访问
│   ├── event/index.ts       # 行为事件
│   ├── error/index.ts       # 错误监控
│   ├── performance/index.ts # 性能指标
│   └── report/index.ts      # 数据上报
├── index.ts                 # 主入口，导出 Tracker 类
├── package.json
└── vite.config.ts
```

---

## package.json 配置

SDK 以库模式构建，支持 ESM / CJS / UMD / IIFE 四种格式：

```json
{
  "name": "@nexura/tracker",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/tracker.js",
      "require": "./dist/tracker.cjs",
      "default": "./dist/tracker.js"
    }
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@nexura/common": "workspace:*",
    "@fingerprintjs/fingerprintjs": "^5.1.0",
    "ua-parser-js": "^2.0.9",
    "web-vitals": "^5.1.0"
  },
  "devDependencies": {
    "vite": "^8.0.1",
    "vite-plugin-dts": "^4.5.4"
  }
}
```

---

## vite.config.ts（库模式构建）

```typescript
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      outDirs: 'dist',
      entryRoot: '.',
    })
  ],
  build: {
    minify: true,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: 'index.ts',
      name: 'tracker',
      fileName: 'tracker',
      formats: ['es', 'cjs', 'umd', 'iife'],
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
```

---

## 主入口（index.ts）

`Tracker` 类初始化时自动启动所有模块：

```typescript
import type { TrackerConfig } from '@nexura/common/tracker';
import { getFingerprint } from '@/uv';
import { reportEvent } from '@/event';
import { reportError } from '@/error';
import { reportPv } from '@/pv';
import { reportPerformance } from '@/performance';
import { reportFetch } from '@/report';

export class Tracker {
    private config: TrackerConfig;
    private visitorId: string | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(config: TrackerConfig) {
        this.config = config;
        this.init();
    }

    protected async init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = (async () => {
            this.visitorId = await getFingerprint(this.config);
            reportEvent(this.visitorId, this.config);
            reportError(this.visitorId, this.config);
            reportPv(this.visitorId, this.config);
            reportPerformance(this.visitorId, this.config);
        })();
        return this.initPromise;
    }

    // 用户登录后调用，关联匿名访客与真实用户
    public async setUserId(userId: string) {
        await this.init();
        const url = this.config.baseUrl + this.config.uv.updateApi;
        await reportFetch(url, {
            visitorId: this.visitorId,
            userId,
        });
    }
}
```

---

## UV 模块（src/uv/index.ts）

使用 FingerprintJS 生成设备指纹，识别独立访客：

```typescript
import type { UvDto, TrackerConfig } from '@nexura/common/tracker';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { UAParser } from 'ua-parser-js';
import { reportFetch } from '@/report';

export const getBrowserInfo = () => {
    const ua = new UAParser();
    return {
        browser: ua.getBrowser().name,
        os: ua.getOS().name,
        device: ua.getDevice().type || 'desktop',
    };
};

export const getFingerprint = async (config: TrackerConfig) => {
    const browserInfo = getBrowserInfo();
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const body: UvDto = {
        anonymousId: result.visitorId,
        browser: browserInfo.browser,
        os: browserInfo.os,
        device: browserInfo.device,
    };

    const url = config.baseUrl + config.uv.api;
    const res = await reportFetch(url, body);
    return res.data;  // 返回后端生成的 visitorId
};
```

---

## PV 模块（src/pv/index.ts）

监听三种路由变化方式（hash / popstate / pushState / replaceState）：

```typescript
import type { PvDto, TrackerConfig } from '@nexura/common/tracker';
import { report } from '@/report';

const reportView = (visitorId: string, config: TrackerConfig) => {
    const url = config.baseUrl + config.pv.api;
    const isHash = window.location.href.includes('#');
    const body: PvDto = {
        visitorId,
        url: window.location.protocol + '//' + window.location.host,
        referrer: document.referrer,
        path: isHash ? '/' + window.location.hash : window.location.pathname,
    };
    report(url, body);
};

export const reportPv = (visitorId: string, config: TrackerConfig) => {
    reportView(visitorId, config);  // 初始化时立即上报

    window.addEventListener('hashchange', () => reportView(visitorId, config));
    window.addEventListener('popstate', () => reportView(visitorId, config));

    // 拦截 pushState / replaceState（Vue Router history 模式）
    const originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        reportView(visitorId, config);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        reportView(visitorId, config);
    };
};
```

---

## Event 模块（src/event/index.ts）

采集按钮点击事件（button 及其子 span）：

```typescript
import type { EventDto, TrackerConfig } from '@nexura/common/tracker';
import { report } from '@/report';

export const reportEvent = (visitorId: string, config: TrackerConfig) => {
    const url = config.baseUrl + config.event.api;

    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isButton = target.nodeName === 'BUTTON';
        const isButtonSpan = target.nodeName === 'SPAN' && target.parentElement?.nodeName === 'BUTTON';

        if (!isButton && !isButtonSpan) return;

        const rect = target.getBoundingClientRect();
        const body: EventDto = {
            visitorId,
            event: e.type,
            payload: {
                x: rect.left.toFixed(2),
                y: rect.top.toFixed(2),
                width: rect.width.toFixed(2),
                height: rect.height.toFixed(2),
                text: target.textContent,
            },
            url: window.location.href,
        };
        report(url, body);
    });
};
```

---

## Error 模块（src/error/index.ts）

捕获全局 JS 错误和 Promise 未处理异常：

```typescript
import type { ErrorDto, TrackerConfig } from '@nexura/common/tracker';
import { report } from '@/report';

export const reportError = (visitorId: string, config: TrackerConfig) => {
    const url = config.baseUrl + config.error.api;

    window.addEventListener('error', (e: ErrorEvent) => {
        const body: ErrorDto = {
            visitorId,
            error: 'js',
            message: e.message,
            stack: e.error?.stack,
            url: e.filename,
        };
        report(url, body);
    });

    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        const isError = e.reason instanceof Error;
        const body: ErrorDto = {
            visitorId,
            error: 'promise',
            message: isError ? e.reason.message : JSON.stringify(e.reason),
            stack: isError ? e.reason.stack : 'Promise Rejection',
            url: window.location.href,
        };
        report(url, body);
    });
};
```

---

## Performance 模块（src/performance/index.ts）

采集 Web Vitals 核心性能指标（FP / FCP / LCP / INP / CLS）：

```typescript
import type { PerformanceDto, TrackerConfig } from '@nexura/common/tracker';
import { report } from '@/report';
import { onINP, onCLS } from 'web-vitals';

export const reportPerformance = async (visitorId: string, config: TrackerConfig) => {
    const url = config.baseUrl + config.performance.api;
    let fp = 0, fcp = 0, lcp = 0, inp = 0, cls = 0;

    // FP 和 FCP
    const entries = performance.getEntriesByType('paint');
    fp = entries.find(e => e.name === 'first-paint')?.startTime ?? 0;
    fcp = entries.find(e => e.name === 'first-contentful-paint')?.startTime ?? 0;

    // LCP（异步等待最大内容绘制完成）
    const { lcpTime, observer } = await new Promise<{ lcpTime: number; observer: PerformanceObserver }>((resolve) => {
        const obs = new PerformanceObserver((list) => {
            resolve({ lcpTime: list.getEntries().at(-1)?.startTime ?? 0, observer: obs });
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
    });
    observer.disconnect();
    lcp = lcpTime;

    onINP((metric) => { inp = metric.value; });
    onCLS((metric) => { cls = metric.value; });

    // 页面隐藏时上报（保证最终数据完整）
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            const body: PerformanceDto = { visitorId, fp, fcp, lcp, inp, cls };
            report(url, body);
        }
    }, { once: true });
};
```

---

## Report 模块（src/report/index.ts）

两种上报方式：

```typescript
// sendBeacon：fire-and-forget，不阻塞页面卸载，适合 PV/Event/Error/Performance
export const report = (url: string, body: any) => {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
};

// fetch：需要响应结果，适合 UV 初始化（需拿到 visitorId）
export const reportFetch = async (url: string, body: any) => {
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
};
```

**为什么两种方式：**
- `sendBeacon`：不阻塞页面、不需要响应结果，用于大多数上报
- `reportFetch`：需要拿后端返回的 `visitorId`，只在 UV 初始化时用

---

## 后端配套（TrackerModule）

后端对应 `server/apps/server/src/tracker/` 模块：

**接口清单：**

| 接口 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tracker/uv` | 上报独立访客，返回 visitorId |
| POST | `/api/v1/tracker/update-uv` | 更新访客的 userId |
| POST | `/api/v1/tracker/pv` | 上报页面访问 |
| POST | `/api/v1/tracker/event` | 上报行为事件 |
| POST | `/api/v1/tracker/error` | 上报错误信息 |
| POST | `/api/v1/tracker/performance` | 上报性能指标 |

所有接口均不需要鉴权（`AuthGuard`），因为埋点在用户未登录时也要能上报。

---

## 接入方式（在 apps/web 中使用）

### 安装

`@nexura/tracker` 已在 workspace 中，`apps/web/package.json` 中引入：

```json
{
  "dependencies": {
    "@nexura/tracker": "workspace:*"
  }
}
```

先构建 SDK：

```bash
cd apps/tracker
pnpm build
```

### 初始化

在 `apps/web/src/main.ts` 中初始化（或在单独的 `tracker.ts` 文件中）：

```typescript
import { Tracker } from '@nexura/tracker';

const tracker = new Tracker({
  baseUrl: '/api/v1',
  uv: {
    api: '/tracker/uv',
    updateApi: '/tracker/update-uv',
  },
  pv: { api: '/tracker/pv' },
  event: { api: '/tracker/event' },
  error: { api: '/tracker/error' },
  performance: { api: '/tracker/performance' },
});
```

### 用户登录后关联 userId

```typescript
// 在登录成功后调用
const res = await login(form);
if (res.success) {
  userStore.setUser(res.data);
  tracker.setUserId(res.data.id);  // 关联真实用户
}
```

---

## 构建与发布

```bash
# 开发模式
cd apps/tracker
pnpm dev

# 构建
pnpm build
# 输出：dist/tracker.js (ESM)、dist/tracker.cjs (CJS)、dist/index.d.ts (类型)
```

---

## 新增采集模块的步骤

1. 在 `src/{module}/index.ts` 实现采集逻辑
2. 在 `packages/common/tracker/index.ts` 定义对应 DTO 类型
3. 在 `index.ts` 的 `init()` 中调用新模块
4. 在后端 `tracker.controller.ts` 新增对应接口
5. 在后端 `tracker.service.ts` 实现存储逻辑
6. 在 Prisma Schema 中新增对应数据表
