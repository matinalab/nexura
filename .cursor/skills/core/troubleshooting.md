---
triggers:
  - 报错
  - 排错
  - 调试
  - undefined
  - 类型错误
  - 接口异常
  - 404
  - 401
  - 循环依赖
  - 迁移失败
  - 找不到 Provider
---

# 常见问题与排错

---

## 一、Prisma 相关

### 类型错误：`Prisma.XxxWhereInput` 找不到

原因：迁移后没有重新生成客户端。

```bash
cd server
pnpm prisma generate
```

### 迁移失败：表已存在

```bash
pnpm prisma migrate resolve --applied "迁移名称"
```

### 分页数据为空但 total > 0

原因：`page` 和 `pageSize` 从 URL query 传来是 string，没有转换。

```typescript
// 错误
skip: (page - 1) * pageSize   // NaN

// 正确
skip: (Number(page) - 1) * Number(pageSize)
```

### BigInt 序列化报错

表中有 BigInt 字段时，JSON.stringify 会报错。
项目全局拦截器已处理，无需手动转换，但要确保 `main.ts` 中正确挂载了 `InterceptorInterceptor`。

---

## 二、NestJS 相关

### 循环依赖（Circular dependency）

报错：`Nest cannot create the XxxModule instance. The module at index [n] of the XxxModule "imports" array is undefined.`

解决：使用 `forwardRef`：

```typescript
@Module({
  imports: [forwardRef(() => AuthModule)],
})
export class UserModule {}
```

### `@Req() req.user` 为 undefined

原因：接口没有加 `@UseGuards(AuthGuard)` 装饰器。

```typescript
@UseGuards(AuthGuard)  // 必须加
@Post('update')
update(@Req() req: Request) { ... }
```

### 模块注入报错：找不到 Provider

报错：`Nest can't resolve dependencies of the XxxService (?). Please make sure that the argument PrismaService at index [0] is available in the XxxModule context.`

原因：`XxxModule` 没有 import `SharedModule`（提供 `PrismaService` 和 `ResponseService`）。

解决：`SharedModule` 是 `@Global()` 的，已在 `AppModule` 中 import，所有子模块自动可用，无需重复 import。若仍报错，检查 `app.module.ts` 是否正确导入了 `SharedModule`。

### 文件上传接口 file 为 undefined

原因：前端 FormData key 必须和 `FileInterceptor('key')` 一致。

```typescript
// 后端
@UseInterceptors(FileInterceptor('file'))

// 前端
formData.append('file', selectedFile)  // key 必须是 'file'
```

---

## 三、前端相关

### axios 返回 undefined 而不是 Response 对象

原因：响应拦截器 `return res.data`，实际返回的已经是业务数据，不是 axios 原始响应。确保 API 函数的 cast 类型是正确的：

```typescript
// 正确写法
return serverApi.post('/user/login', data) as Promise<Response<WebResultUser>>

// 如果后端返回格式不匹配，检查后端是否使用了 response.success()
```

### Pinia store 刷新后数据丢失

原因：Store 没有配置持久化。

```typescript
defineStore('user', () => { ... }, { persist: true })
```

### 路由跳转后页面数据不更新

原因：组件复用时 `onMounted` 不会重复触发。使用路由守卫或 `watch` 监听路由变化：

```typescript
import { watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
watch(() => route.params.id, () => {
    getDetail();
}, { immediate: true });
```

### 搜索后分页数据不对

原因：搜索时没有重置 `page` 到 1。

```typescript
const search = () => {
    query.value.page = 1;  // 必须重置
    getList();
};
```

---

## 四、Tracker SDK 相关

### visitorId 为 null

原因：`init()` 是异步的，`setUserId` 在初始化完成前调用。

```typescript
// 正确：setUserId 内部已调用 await this.init()
await tracker.setUserId(userId);
```

### PV 重复上报

原因：同时监听了 `hashchange` 和 `popstate`，在某些路由模式下会触发两次。根据实际路由模式（hash / history）保留对应监听器。

### sendBeacon 在 HTTP 环境不生效

原因：部分浏览器在非 HTTPS 环境限制 `sendBeacon`。开发环境可改用 `reportFetch` 替代。

### SDK 构建后类型提示丢失

原因：`vite-plugin-dts` 未正确生成 `.d.ts`。确保 `vite.config.ts` 中配置了 `dts` 插件，并在引用方安装包后重新构建：

```bash
cd apps/tracker
pnpm build
```

---

## 五、环境变量相关

### ConfigService 读取值为 undefined

原因：`.env` 文件未在 `server/` 目录下（不是根目录），或 `SharedModule` 未正确配置。

检查：
1. 确认 `.env` 在 `server/.env`
2. 确认 `ConfigModule.forRoot({ envFilePath: '.env' })` 在 `SharedModule` 中

### pnpm workspace 包找不到

报错：`Cannot find module '@nexura/common/user'`

原因：未在 `pnpm-workspace.yaml` 中正确配置，或包名与 `package.json` 不一致。

```bash
# 在根目录重新安装
pnpm install
```

---

## 六、Prisma Studio 查看数据

```bash
cd server
pnpm prisma studio
# 访问 http://localhost:5555
```

---

## 七、CORS 配置

如果前后端跨域访问（非代理模式），在 `main.ts` 中开启：

```typescript
const app = await NestFactory.create(AppModule, { cors: true });
```

开发环境建议使用 Vite proxy（`vite.config.ts`）而非 CORS，生产环境用 nginx 反向代理。
