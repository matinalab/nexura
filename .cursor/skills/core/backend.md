---
triggers:
  - 新增模块
  - 新增接口
  - 加接口
  - Service
  - Controller
  - 后端开发
  - Prisma Schema
  - migrate
  - 数据库迁移
---

# 后端开发流程

详细的后端开发步骤，包含 Prisma Schema、Migration、Service、Controller、Module 的完整规范。

---

## Step 1: Prisma Schema 新增 Model

**位置**: `server/prisma/schema.prisma`

### 基础 Model 结构

```prisma
model Xxx {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 关联用户的 Model

```prisma
model Xxx {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

同时在 `User` model 中添加反向关联：

```prisma
model User {
  // 已有字段 ...
  xxxList Xxx[]
}
```

### 需要唯一组合约束

```prisma
@@unique([userId, xxxId])
```

### 需要索引

```prisma
@@index([userId])
@@index([createdAt])
```

### 可选字段

字段后加 `?`：

```prisma
description String?
email       String? @unique
```

---

## Step 2: 执行 Migration

```bash
cd server
pnpm prisma migrate dev --name add_xxx
```

执行后自动生成客户端代码到 `server/libs/shared/src/generated/prisma/`，无需手动修改。

---

## Step 3: 公共类型

**位置**: `packages/common/xxx/index.ts`

基本结构：

```typescript
// 主实体
export interface Xxx { ... }

// DTO（用 Pick/Omit/Partial 组合）
export type CreateXxxDto = Pick<Xxx, '字段1' | '字段2'>
export type UpdateXxxDto = Partial<Pick<Xxx, '字段1'>> & { id: string }

// 查询参数
export interface XxxQuery {
    page: number;
    pageSize: number;
}

// 列表返回
export interface XxxList {
    list: Xxx[];
    total: number;
}
```

---

## Step 4: Service

**位置**: `server/apps/server/src/xxx/xxx.service.ts`

### 依赖注入

Service 固定注入 `PrismaService` 和 `ResponseService`，其他依赖按需添加：

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly response: ResponseService,
) {}
```

### 常见操作模式

#### 查询列表（分页）

```typescript
async findAll(query: XxxQuery) {
  const { page, pageSize } = query;
  const where: Prisma.XxxWhereInput = { ... };

  const total = await this.prisma.xxx.count({ where });
  const list = await this.prisma.xxx.findMany({
    where,
    skip: (Number(page) - 1) * Number(pageSize),
    take: Number(pageSize),
    orderBy: { createdAt: 'desc' },
  });

  return this.response.success({ total, list });
}
```

#### 创建记录

```typescript
async create(dto: CreateXxxDto) {
  const record = await this.prisma.xxx.create({
    data: { ...dto },
  });
  return this.response.success(record);
}
```

#### 更新记录（含权限校验）

```typescript
async update(dto: UpdateXxxDto, userId: string) {
  const record = await this.prisma.xxx.findUnique({ where: { id: dto.id } });
  if (!record) return this.response.error(null, '记录不存在');
  if (record.userId !== userId) return this.response.error(null, '无权限操作');

  const updated = await this.prisma.xxx.update({
    where: { id: dto.id },
    data: { name: dto.name },
  });
  return this.response.success(updated);
}
```

#### 删除记录（含权限校验）

```typescript
async remove(id: string, userId: string) {
  const record = await this.prisma.xxx.findUnique({ where: { id } });
  if (!record) return this.response.error(null, '记录不存在');
  if (record.userId !== userId) return this.response.error(null, '无权限操作');

  await this.prisma.xxx.delete({ where: { id } });
  return this.response.success(true);
}
```

#### upsert（存在则更新，不存在则创建）

```typescript
const record = await this.prisma.xxx.upsert({
  where: { uniqueField: dto.uniqueField },
  create: { ...dto },
  update: { name: dto.name },
  select: { id: true },
});
```

#### 动态过滤条件

```typescript
const where: Prisma.XxxWhereInput = {
  name: dto.name ? { contains: dto.name } : undefined,
  userId: dto.userId,
  // 布尔标签过滤
  ...Object.fromEntries(
    Object.entries(dto).filter(([_, v]) => v === true)
  ),
};
```

### Select 对象

字段多或含敏感字段时，抽出 `{module}.select.ts`：

```typescript
// xxx.select.ts
export const xxxSelect = {
  id: true,
  name: true,
  createdAt: true,
  // 敏感字段不写，等同于 false
};
```

在 Service 中引入使用：

```typescript
import { xxxSelect } from './xxx.select';

const record = await this.prisma.xxx.create({
  data,
  select: xxxSelect,
});
```

---

## Step 5: Controller

**位置**: `server/apps/server/src/xxx/xxx.controller.ts`

### 导入规则

```typescript
import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { XxxService } from './xxx.service';
import type { CreateXxxDto, XxxQuery } from '@nexura/common/xxx';
import { AuthGuard } from '@libs/shared/auth/auth.guard';
import type { Request } from 'express';
```

### 公开接口（无需登录）

```typescript
@Get()
findAll(@Query() query: XxxQuery) {
  return this.xxxService.findAll(query);
}
```

### 登录接口

```typescript
@UseGuards(AuthGuard)
@Post('create')
create(@Body() dto: CreateXxxDto, @Req() req: Request) {
  return this.xxxService.create(dto, req.user.userId);
}
```

### 路径参数

```typescript
@UseGuards(AuthGuard)
@Post('delete/:id')
remove(@Param('id') id: string, @Req() req: Request) {
  return this.xxxService.remove(id, req.user.userId);
}
```

### 文件上传

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
upload(@UploadedFile() file: Express.Multer.File) {
  return this.xxxService.upload(file);
}
```

---

## Step 6: Module

**位置**: `server/apps/server/src/xxx/xxx.module.ts`

### 基础（无额外依赖）

```typescript
import { Module } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { XxxController } from './xxx.controller';

@Module({
  controllers: [XxxController],
  providers: [XxxService],
})
export class XxxModule {}
```

### 依赖 AuthModule（使用 JwtService / AuthService）

```typescript
@Module({
  controllers: [XxxController],
  providers: [XxxService],
  imports: [AuthModule],
})
export class XxxModule {}
```

---

## Step 7: 注册到 AppModule

**位置**: `server/apps/server/src/app.module.ts`

```typescript
import { XxxModule } from './xxx/xxx.module';

@Module({
  imports: [
    // 已有模块 ...
    XxxModule,   // 新增
  ],
})
export class AppModule {}
```

---

## 常见反模式

### 不要在 Controller 写业务逻辑

```typescript
// 错误
@Post('create')
async create(@Body() dto: CreateXxxDto) {
  const record = await this.prisma.xxx.create({ data: dto }); // Controller 不该直接操作 DB
  return record;
}

// 正确
@Post('create')
create(@Body() dto: CreateXxxDto) {
  return this.xxxService.create(dto);
}
```

### 不要直接返回 Prisma 结果

```typescript
// 错误
return await this.prisma.xxx.findMany();

// 正确
const list = await this.prisma.xxx.findMany();
return this.response.success(list);
```

### 不要遗漏 import type

```typescript
// 错误
import { CreateXxxDto } from '@nexura/common/xxx';

// 正确
import type { CreateXxxDto } from '@nexura/common/xxx';
```


---

## 完整代码模板

### Prisma Schema 模板

**基础 Model**

```prisma
model Xxx {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**关联用户的 Model**

```prisma
model Xxx {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}
```

---

### 公共类型模板

**位置**: `packages/common/{module}/index.ts`

```typescript
export interface Xxx {
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateXxxDto = Pick<Xxx, 'name'>;
export type UpdateXxxDto = Partial<Pick<Xxx, 'name'>> & { id: string };

export interface XxxQuery {
    page: number;
    pageSize: number;
    name?: string;
}

export interface XxxList {
    list: Xxx[];
    total: number;
}
```

---

### Service 模板

**位置**: `server/apps/server/src/{module}/{module}.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService, ResponseService } from '@libs/shared';
import type { CreateXxxDto, UpdateXxxDto, XxxQuery, XxxList } from '@nexura/common/xxx';
import type { Prisma } from '@libs/shared/generated/prisma/client';

@Injectable()
export class XxxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
  ) {}

  async findAll(query: XxxQuery, userId: string) {
    const { page, pageSize, name } = query;
    const where: Prisma.XxxWhereInput = {
      userId,
      name: name ? { contains: name } : undefined,
    };

    const total = await this.prisma.xxx.count({ where });
    const list = await this.prisma.xxx.findMany({
      where,
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { createdAt: 'desc' },
    });

    return this.response.success<XxxList>({ total, list });
  }

  async create(dto: CreateXxxDto, userId: string) {
    const record = await this.prisma.xxx.create({
      data: { name: dto.name, userId },
    });
    return this.response.success(record);
  }

  async update(dto: UpdateXxxDto, userId: string) {
    const record = await this.prisma.xxx.findUnique({ where: { id: dto.id } });
    if (!record) return this.response.error(null, '记录不存在');
    if (record.userId !== userId) return this.response.error(null, '无权限操作');

    const updated = await this.prisma.xxx.update({
      where: { id: dto.id },
      data: { name: dto.name },
    });
    return this.response.success(updated);
  }

  async remove(id: string, userId: string) {
    const record = await this.prisma.xxx.findUnique({ where: { id } });
    if (!record) return this.response.error(null, '记录不存在');
    if (record.userId !== userId) return this.response.error(null, '无权限操作');

    await this.prisma.xxx.delete({ where: { id } });
    return this.response.success(true);
  }
}
```

---

### Controller 模板

**位置**: `server/apps/server/src/{module}/{module}.controller.ts`

```typescript
import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { XxxService } from './xxx.service';
import type { CreateXxxDto, UpdateXxxDto, XxxQuery } from '@nexura/common/xxx';
import { AuthGuard } from '@libs/shared/auth/auth.guard';
import type { Request } from 'express';

@Controller('xxx')
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query() query: XxxQuery, @Req() req: Request) {
    return this.xxxService.findAll(query, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('create')
  create(@Body() dto: CreateXxxDto, @Req() req: Request) {
    return this.xxxService.create(dto, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('update')
  update(@Body() dto: UpdateXxxDto, @Req() req: Request) {
    return this.xxxService.update(dto, req.user.userId);
  }

  @UseGuards(AuthGuard)
  @Post('delete/:id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.xxxService.remove(id, req.user.userId);
  }
}
```

---

### Module 模板

**位置**: `server/apps/server/src/{module}/{module}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { XxxController } from './xxx.controller';

@Module({
  controllers: [XxxController],
  providers: [XxxService],
})
export class XxxModule {}
```

---

### Select 对象模板

**位置**: `server/apps/server/src/{module}/{module}.select.ts`

```typescript
export const xxxSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
};
```
