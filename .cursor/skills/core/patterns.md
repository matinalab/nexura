---
triggers:
  - 联表查询
  - 关联查询
  - 文件上传
  - 动态筛选
  - 弹窗表单
  - SSE
  - 实时推送
  - 进度条
  - 流式进度
  - 复杂查询
---

# 常见业务模式

本文档覆盖项目中常见的业务场景和实战模式，超出基础 CRUD 的复杂需求。

---

## 一、Prisma 进阶操作

### 1. 联表查询（include）

查询课程记录并关联课程详情和支付记录：

```typescript
const courseRecords = await this.prisma.courseRecord.findMany({
  where: { userId },
  include: {
    course: true,
    paymentRecord: true,
  }
});
```

只需要部分字段时用 `select`：

```typescript
include: {
  course: {
    select: { id: true, name: true, price: true }
  }
}
```

### 2. 嵌套条件查询

查询已支付成功的课程：

```typescript
const records = await this.prisma.courseRecord.findMany({
  where: {
    userId,
    paymentRecord: {
      tradeStatus: TradeStatus.TRADE_SUCCESS
    }
  },
  include: { course: true }
});
```

### 3. upsert（存在则更新，不存在则创建）

```typescript
const visitor = await this.prisma.visitor.upsert({
  where: { anonymousId: dto.anonymousId },
  create: {
    anonymousId: dto.anonymousId,
    userId: dto.userId,
    browser: dto.browser,
  },
  update: {
    userId: dto.userId,
    browser: dto.browser,
  },
  select: { id: true }
});
```

### 4. 组合唯一约束

```prisma
model WordBookRecord {
  userId String
  wordId String

  @@unique([userId, wordId])
}
```

插入时冲突会抛异常，需用 try-catch 处理。

### 5. 聚合查询

```typescript
const total = await this.prisma.xxx.count({ where });

const sum = await this.prisma.paymentRecord.aggregate({
  where: { userId },
  _sum: { amount: true }
});
```

---

## 二、枚举类型处理

```prisma
enum TradeStatus {
  NOT_PAY
  WAIT_BUYER_PAY
  TRADE_CLOSED
  TRADE_SUCCESS
  TRADE_FINISHED
}
```

```typescript
import { TradeStatus } from '@libs/shared/generated/prisma/enums';

const records = await this.prisma.paymentRecord.findMany({
  where: { tradeStatus: TradeStatus.TRADE_SUCCESS }
});
```

---

## 三、Decimal 类型处理

Prisma 返回的 Decimal 需要格式化后再返回：

```typescript
const courses = await this.prisma.course.findMany();
const list = courses.map(item => ({
  ...item,
  price: Number(item.price).toFixed(2)
}));
```

---

## 四、文件上传（MinIO）

### Service 实现

```typescript
async uploadFile(file: Express.Multer.File) {
  if (!file) return this.response.error(null, '文件不存在');
  if (file.size > 1024 * 1024 * 5) {
    return this.response.error(null, '文件大小不能超过5MB');
  }

  const client = this.minioService.getClient();
  const bucket = this.minioService.getBucket();
  const fileName = `${Date.now()}-${file.originalname}`;

  await client.putObject(bucket, fileName, file.buffer, file.size, {
    'Content-Type': file.mimetype
  });

  const isHttps = !!Number(this.configService.get('MINIO_USE_SSL'));
  const protocol = isHttps ? 'https' : 'http';
  const port = this.configService.get<string>('MINIO_PORT');
  const databaseUrl = `/${bucket}/${fileName}`;
  const previewUrl = `${protocol}://${this.configService.get('MINIO_ENDPOINT')}:${port}${databaseUrl}`;

  return this.response.success({ previewUrl, databaseUrl });
}
```

### Controller

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  return this.xxxService.uploadFile(file);
}
```

### 前端调用

```typescript
const formData = new FormData();
formData.append('file', file);
const res = await uploadFile(formData);
```

---

## 五、分页参数类型转换

Query 参数从 URL 传来都是 string，需要显式转换：

```typescript
const list = await this.prisma.xxx.findMany({
  skip: (Number(page) - 1) * Number(pageSize),
  take: Number(pageSize),
});
```

---

## 六、动态筛选条件

布尔标签动态过滤：

```typescript
const { page, pageSize, word, ...rest } = query;
const tags = Object.fromEntries(
  Object.entries(rest).filter(([_, value]) => value === true)
);

const where: Prisma.XxxWhereInput = {
  word: word ? { contains: word } : undefined,
  ...tags  // { gk: true, cet4: true }
};
```

---

## 七、前端弹窗表单

```vue
<template>
  <el-button @click="dialogVisible = true">新增</el-button>

  <el-dialog v-model="dialogVisible" title="新增" width="500px">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({ name: '' });

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
};

const handleSubmit = async () => {
  await formRef.value?.validate();
  const res = await createXxx(form);
  if (res.success) {
    ElMessage.success('创建成功');
    dialogVisible.value = false;
    getList();
  }
};
</script>
```

---

## 八、Socket.IO 后端 Gateway

```typescript
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    this.server.emit('message', payload);
  }
}
```

Socket 前端连接（`useSocket` hook）见 `core/frontend-advanced.md`。
BullMQ 定时任务完整实现见 `core/ai.md`。

---

## 九、日期格式化

```typescript
import dayjs from 'dayjs';
const formatDate = (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss');
```

在表格中：

```vue
<el-table-column prop="createdAt" label="创建时间">
  <template #default="{ row }">
    {{ dayjs(row.createdAt).format('YYYY-MM-DD') }}
  </template>
</el-table-column>
```

---

## 十、SSE 流式响应

### 后端实现

```typescript
@Get('stream')
@Sse()
stream(): Observable<MessageEvent> {
  return interval(1000).pipe(
    map((num) => ({ data: { count: num } }))
  );
}
```

### 前端接收

```typescript
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource('/api/v1/stream', {
  onmessage(ev) {
    console.log(ev.data);
  }
});
```
