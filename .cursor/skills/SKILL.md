---
name: nexura-dev
description: Nexura 项目开发规范。新增模块、接口、页面、从零搭建、AI 功能、埋点 SDK 等场景均适用。
metadata:
  short-description: NestJS + Vue3 全栈模块开发流程
---

# Nexura 开发规范

## 项目结构

```
nexura/
├── apps/
│   ├── web/                         # Vue3 前端
│   │   └── src/
│   │       ├── apis/{module}/       # axios 接口封装
│   │       ├── router/{module}/     # 路由配置
│   │       ├── views/{Module}/      # 页面视图
│   │       └── stores/{module}.ts   # Pinia store（按需）
│   └── tracker/                     # 埋点 SDK（独立发布）
├── packages/
│   ├── common/{module}/index.ts     # 前后端共享类型
│   └── config/index.ts              # 统一端口配置
└── server/
    ├── apps/
    │   ├── server/                  # 主后端服务 :3000
    │   └── ai/                      # AI 服务 :3001
    └── libs/shared/                 # 共享库（Prisma、Response、拦截器等）
```

## 新增模块开发顺序

```
Step 1 → Prisma Schema 新增 Model
Step 2 → pnpm prisma migrate dev --name add_xxx
Step 3 → packages/common/{module}/index.ts 定义共享类型
Step 4 → 后端：service → controller → module → 注册 app.module
Step 5 → 前端：apis → router → view → store（按需）
```

---

## 核心约定速查

### 命名规则
| 类型 | 规则 | 示例 |
|------|------|------|
| 后端模块 | 小写 + 连字符 | `word-book` |
| 前端文件夹 | 首字母大写驼峰 | `WordBook` |
| 后端文件 | `{module}.service/controller/module.ts` | `user.service.ts` |
| 前端 API | `apis/{module}/index.ts` | `apis/user/index.ts` |
| 前端 View | `views/{Module}/index.vue` | `views/User/index.vue` |
| 公共类型 | `packages/common/{module}/index.ts` | `common/user/index.ts` |

### HTTP 方法
- 查询：`@Get`
- 创建 / 更新 / 删除：统一 `@Post`（项目约定，非 RESTful）

### 鉴权
```typescript
@UseGuards(AuthGuard)
@Post('create')
create(@Body() dto: CreateDto, @Req() req: Request) {
  const userId = req.user.userId; // { userId, name, email }
}
```

### 响应
```typescript
return this.response.success(data);   // 成功
return this.response.error(null, '错误信息'); // 失败
// 严禁直接 return 裸数据
```

### 类型导入
```typescript
import type { Xxx } from '@nexura/common/xxx';  // 纯类型用 import type
import { Injectable } from '@nestjs/common';     // 值用 import
```

### DTO 组合
```typescript
export type CreateXxxDto = Pick<Xxx, 'name' | 'field'>;
export type UpdateXxxDto = Partial<Pick<Xxx, 'name'>> & { id: string };
```

### 分页
- 入参：`{ page: number, pageSize: number }`
- 出参：`{ list: T[], total: number }`
- Prisma：`skip: (page - 1) * pageSize, take: pageSize`
- 搜索时重置：`query.value.page = 1`

### 前端 API 命名
`get{X}List` / `get{X}Detail` / `create{X}` / `update{X}` / `delete{X}`

---

## 文件加载规则（根据任务自动判断）

读取本文件后，**根据任务类型加载对应文件**，不需要全部读取。

### 后端开发（新增模块 / 新增接口 / Service / Controller）
必读：`core/backend.md`

### 前端开发（新增页面 / 路由 / API 封装 / Store）
必读：`core/frontend.md`

### 前端进阶（登录弹窗 / Layout / Hooks / Socket 前端 / NestJS WebSocket Gateway / Socket 后端）
必读：`core/frontend-advanced.md`

### 共享库 / 基础设施（MinIO / 邮件 / 支付宝 SDK / 守卫 / 拦截器）
必读：`core/shared-libs.md`

### 高级功能（Prisma 事务 / 支付宝支付流程 / 双 Token 认证）
必读：`core/advanced.md`

### 复杂业务模式（联表查询 / 关联查询 / 文件上传 / 动态筛选 / 弹窗表单 / SSE / 实时推送 / 进度条）
必读：`core/patterns.md`

### AI 功能（Chat 对话 / 流式输出 / LangChain / DeepSeek / BullMQ 定时任务 / 邮件推送 / AI 分析）
必读：`core/ai.md`

### 埋点 SDK（UV / PV / 点击事件 / 错误采集 / 性能监控 / 用户行为追踪）
必读：`core/tracker.md`

### 从零搭建项目（Monorepo 初始化 / 前后端配置 / 共享库搭建）
必读：`core/setup.md` → `core/shared-libs.md`

### 了解业务模块全貌（模块清单 / 接口清单 / 模块关系）
必读：`core/business.md`

### 从零复刻项目（需要完整 Prisma Schema）
必读：`core/business.md` → `core/schema.md`

### 排查报错 / 调试问题（报错 / undefined / 类型错误 / 接口异常）
必读：`core/troubleshooting.md`

### 部署上线（nginx / 构建 / 生产环境 / Docker / 进程管理）
必读：`core/deploy.md`

### UI 微调 / 样式修改 / 文案修改（改颜色 / 改文字 / 改按钮 / 调布局 / 加 class / 改 CSS）
**无需加载任何文件，直接定位目标文件修改即可。**

---

## 判断示例

| 用户描述 | 加载文件 |
|---------|---------|
| 新增一个收藏模块，前后端都要 | backend + frontend |
| 给课程列表加搜索和分页 | frontend |
| 给现有模块加一个查询接口（不改 Schema） | backend（跳过 Step1/2） |
| 为什么 req.user 是 undefined | troubleshooting |
| 接入 MinIO 文件上传 | shared-libs |
| 实现支付宝回调 + 事务 | advanced |
| 做一个 AI 对话页面 | ai + frontend |
| 做个实时进度条 / SSE 推送 | patterns |
| 做 NestJS WebSocket Gateway | frontend-advanced |
| 用户行为追踪 / 采集点击事件 | tracker |
| 从零搭建整个项目 | setup + shared-libs |
| 复刻 Nexura 项目 | business + schema |
| 现在有哪些模块和接口 | business |
| 开发埋点 SDK | tracker |
| 怎么部署上线 / 配置 nginx | deploy |
| 把这个按钮改成红色 | 无需加载 |
| 修改页面标题文案 | 无需加载 |
| 调整某个组件的间距 | 无需加载 |
