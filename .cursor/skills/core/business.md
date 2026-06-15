---
triggers:
  - 业务模块全览
  - 模块清单
  - 接口清单
  - 模块关系
  - 有哪些模块
  - 有哪些接口
  - 了解项目
---

# 业务模块全览

模块清单、接口清单、模块关系，用于了解全貌或从零复刻时的导航。

完整 Prisma Schema 见 `core/schema.md`。

---

## 模块清单

| 模块 | 后端路径 | 前端路径 | 功能 |
|------|---------|---------|------|
| User | `server/apps/server/src/user/` | `views/Setting/` | 注册/登录/头像上传/个人信息/双Token |
| Auth | `server/apps/server/src/auth/` | `apis/auth/` | Token 生成/刷新/守卫 |
| WordBook | `server/apps/server/src/word-book/` | `views/WordBook/` | 单词词库查询（支持多标签筛选） |
| Learn | `server/apps/server/src/learn/` | `views/Course/Learn/` | 学习单词/保存掌握记录/更新用户词数 |
| Course | `server/apps/server/src/course/` | `views/Course/` | 课程列表/我的已购课程 |
| Pay | `server/apps/server/src/pay/` | `views/Course/components/Pay.vue` | 支付宝下单/回调/Socket 通知前端 |
| Socket | `server/apps/server/src/socket/` | `hooks/useSocket.ts` | WebSocket 房间管理/支付成功推送 |
| Tracker | `server/apps/server/src/tracker/` | `apps/tracker/` (SDK) | UV/PV/Event/Error/Performance 埋点 |
| Chat | `server/apps/ai/src/chat/` | `views/Chat/` | AI 对话/流式响应/历史记录 |
| Prompt | `server/apps/ai/src/prompt/` | `views/Chat/components/Conversations.vue` | AI 角色模式管理 |
| Digest | `server/apps/ai/src/digest/` | — | 定时摘要/BullMQ/邮件通知 |

---

## 各模块接口清单

### User 模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/user/login` | 否 | 手机号+密码登录 |
| POST | `/user/register` | 否 | 注册（name/phone/email/password） |
| POST | `/user/refresh-token` | 否 | 用 refreshToken 换新 Token 对 |
| POST | `/user/upload` | 是 | 上传头像到 MinIO |
| POST | `/user/update` | 是 | 更新个人信息 |

**业务逻辑**：
- 登录成功更新 `lastLoginAt`
- 注册时校验手机号和邮箱唯一性
- 头像上传限制 5MB，存 MinIO，返回 `previewUrl` + `databaseUrl`
- 使用 `userSelect` 排除 password 字段

**Select 对象**：

```typescript
export const userSelect = {
  id: true, name: true, email: true, phone: true,
  address: true, avatar: true, bio: true,
  isTimingTask: true, timingTaskTime: true,
  wordNumber: true, dayNumber: true,
  createdAt: true, updatedAt: true, lastLoginAt: true,
};
```

---

### Auth 模块

**核心逻辑**：
- `generateToken(payload)` → 返回 `{ accessToken, refreshToken }`
- 两个 token 都携带 `tokenType` 字段（`access` / `refresh`）防止互相冒充
- AuthGuard 校验 `tokenType === 'access'`
- 前端 axios 响应拦截器捕获 401，使用请求队列避免并发刷新，刷新失败清空 store 跳转首页

详见 `core/advanced.md`（双 Token 实现）、`core/frontend-advanced.md`（前端拦截器）。

---

### WordBook 模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/word-book` | 否 | 分页+多标签筛选查询单词列表 |

**查询参数**：

```typescript
interface WordQuery {
    page: number; pageSize: number; word?: string;
    gk?: boolean; zk?: boolean; gre?: boolean;
    toefl?: boolean; ielts?: boolean; cet6?: boolean; cet4?: boolean; ky?: boolean;
}
```

**业务逻辑**：支持关键词搜索 + 布尔标签动态筛选，按词频 `frq` 降序排列。

---

### Learn 模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/learn/:id` | 是 | 获取课程对应的待学单词（10个） |
| POST | `/learn/save` | 是 | 保存已掌握的单词 |

**业务逻辑**：
- `getWordList(courseId, userId)`：验证购买 → 读课程 `value` 作为筛选条件 → 排除已学（`none: { userId }`）→ 取 10 个按词频降序
- `saveWordMaster(wordIds[], userId)`：批量 `createMany` → 用户 `wordNumber` 自增（`increment`）

---

### Course 模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/course` | 否 | 获取所有课程列表 |
| GET | `/course/my` | 是 | 获取我已购买的课程 |

**业务逻辑**：
- `price` 从 Decimal 转为 `Number().toFixed(2)`
- `findMy(userId)`：通过 `CourseRecord` + `PaymentRecord.tradeStatus === TRADE_SUCCESS` 联表查询

---

### Pay 模块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/pay/create` | 是 | 创建支付订单 |
| ALL | `/pay/notify` | 否 | 支付宝异步回调 |

**业务逻辑**：
- `create`：校验重复购买 → 事务创建 PaymentRecord → 调支付宝 SDK 生成 URL → 返回 `{ payUrl, timeExpire }`
- `notify`：事务更新 PaymentRecord + 创建 CourseRecord → SocketGateway 通知前端
- 订单号格式：`XM-{nanoid(12)}`

详见 `core/advanced.md`。

---

### Socket 模块

**核心设计**：
- 用户连接时通过 `query.userId` 加入专属房间 `user_{userId}`
- 支付成功后向房间推送 `paymentSuccess` 事件
- 前端收到事件后关闭支付弹窗、刷新课程列表

---

### Tracker 模块

| 接口 | 路径 | 说明 |
|------|------|------|
| POST | `/tracker/uv` | 上报独立访客，返回 visitorId |
| POST | `/tracker/update-uv` | 更新访客的 userId |
| POST | `/tracker/pv` | 上报页面访问 |
| POST | `/tracker/event` | 上报行为事件 |
| POST | `/tracker/error` | 上报错误信息 |
| POST | `/tracker/performance` | 上报性能指标 |

所有接口不需要鉴权。详见 `core/tracker.md`。

---

### Chat 模块（AI 服务）

**角色类型**：

```typescript
type ChatRoleType = 'normal' | 'master' | 'kouhai' | 'matinal';
```

每个角色有独立 systemPrompt，会话通过 `thread_id = userId-role` 隔离。详见 `core/ai.md`。

---

### Digest 模块（AI 服务）

每天 0 点定时执行：查询当天学过单词的用户 → AI 生成摘要 HTML → BullMQ 延迟队列在用户设定时间发邮件。只对 `isTimingTask === true` 且有邮箱的用户执行。

---

## 模块间关系图

```
User ─┬─── WordBookRecord ──── WordBook
      │
      ├─── CourseRecord ──── Course
      │         │
      │         └──── PaymentRecord
      │
      ├─── Visitor ─┬── PageView
      │             ├── TrackEvent
      │             ├── PerformanceEntry
      │             └── ErrorEntry
      │
      └─── (AI Chat via thread_id: userId-role)

Pay.notify() ──→ PaymentRecord + CourseRecord + SocketGateway.emit()
Digest.cron() ──→ query WordBookRecord ──→ AI summarize ──→ EmailService
```

---

## 共享类型完整清单

```
packages/common/
├── user/index.ts       → User, UserLogin, UserRegister, ResultUser, UserUpdate,
│                         AvatarResult, Token, WebResultUser, TokenPayload, RefreshTokenPayload
├── word/index.ts       → Word, WordList, WordQuery
├── learn/index.ts      → ResultLearn
├── course/index.ts     → Course, CourseList
├── pay/index.ts        → CreatePayDto, ResultPay
├── chat/index.ts       → ChatRole, ChatRoleType, ChatMessageType, ChatMessage,
│                         ChatMessageList, ChatMode, ChatModeList, ChatDto
└── tracker/index.ts    → TrackerConfig, PvDto, UpdateUvDto, EventDto, ErrorDto,
                          PerformanceDto, UvDto
```
