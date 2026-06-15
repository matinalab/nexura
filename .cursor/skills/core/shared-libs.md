---
triggers:
  - MinIO
  - 文件存储
  - 邮件
  - 支付宝 SDK
  - PayService
  - EmailService
  - AuthGuard
  - 守卫
  - 拦截器
  - SharedModule
  - 共享库
---

# 共享库（libs/shared）

本文档完整描述 `server/libs/shared/` 的结构、各服务实现和 SharedModule 配置。

---

## 目录结构

```
server/libs/shared/src/
├── auth/
│   └── auth.guard.ts         # JWT 鉴权守卫
├── email/
│   ├── email.module.ts       # 邮件模块
│   └── email.service.ts      # Nodemailer 邮件服务
├── generated/prisma/         # Prisma 自动生成（勿手动修改）
├── interceptor/
│   ├── interceptor.ts        # 全局响应拦截器（统一格式 + BigInt 转换）
│   └── exceptionFilter.ts    # 全局异常过滤器
├── minio/
│   ├── minio.module.ts       # MinIO 模块
│   └── minio.service.ts      # MinIO 文件存储服务
├── pay/
│   ├── pay.module.ts         # 支付宝模块
│   └── pay.service.ts        # 支付宝 SDK 服务
├── prisma/
│   ├── prisma.module.ts      # Prisma 模块
│   └── prisma.service.ts     # Prisma 客户端服务
├── response/
│   ├── response.module.ts    # 响应模块
│   └── response.service.ts   # 统一响应服务
├── index.ts                  # 统一导出
├── shared.module.ts          # 全局共享模块
└── shared.service.ts         # 共享服务（基础）
```

---

## SharedModule（全局模块）

`SharedModule` 是 `@Global()` 的，在 `AppModule` 中 import 一次后，所有子模块自动可用其导出的服务。

```typescript
import { Module, Global } from '@nestjs/common';
import { SharedService } from './shared.service';
import { PrismaModule } from './prisma/prisma.module';
import { ResponseModule } from './response/response.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule } from './minio/minio.module';
import { PayModule } from './pay/pay.module';
import { EmailModule } from './email/email.module';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  providers: [SharedService],
  exports: [SharedService, PrismaModule, ResponseModule, JwtModule, ConfigModule, MinioModule, PayModule, EmailModule],
  imports: [
    PrismaModule,
    ResponseModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('SECRET_KEY'),
        signOptions: { expiresIn: 10 }, // 测试用短过期，生产改为 '15m' 等
      }),
    }),
    MinioModule,
    PayModule,
    EmailModule,
  ],
})
export class SharedModule {}
```

**注意**：
- `BullModule.forRootAsync` 配置 Redis 连接，供 BullMQ 队列使用
- JWT `expiresIn: 10` 是测试值（10 秒），生产环境应改为合理时间
- 所有子模块无需重复 import SharedModule

---

## index.ts 导出

```typescript
export * from './shared.module';
export * from './shared.service';
export * from './prisma/prisma.module';
export * from './prisma/prisma.service';
export * from './response/response.module';
export * from './response/response.service';
export * from './pay/pay.module';
export * from './pay/pay.service';
export * from './email/email.module';
export * from './email/email.service';
```

使用时统一从 `@libs/shared` 导入：

```typescript
import { PrismaService, ResponseService, PayService, EmailService } from '@libs/shared';
```

---

## AuthGuard（鉴权守卫）

位置：`libs/shared/src/auth/auth.guard.ts`

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import type { RefreshTokenPayload } from '@nexura/common/user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    if (!headers.authorization) {
      throw new UnauthorizedException('未登录');
    }

    const token = headers.authorization.split(' ')[1];
    try {
      const decoded = this.jwtService.verify<RefreshTokenPayload>(token);
      if (decoded.tokenType !== 'access') {
        throw new UnauthorizedException('token已过期或无效');
      }
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('token已过期或无效');
    }
  }
}
```

**导入方式**（注意路径不是从 index.ts 导出的）：

```typescript
import { AuthGuard } from '@libs/shared/auth/auth.guard';
```

---

## MinioService（文件存储）

位置：`libs/shared/src/minio/minio.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly minioClient: Minio.Client;

    constructor(private readonly configService: ConfigService) {
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
            port: Number(this.configService.get('MINIO_PORT')),
            useSSL: !!Number(this.configService.get<string>('MINIO_USE_SSL')),
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY')!,
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY')!,
        });
    }

    async onModuleInit() {
        const bucket = this.configService.get<string>('MINIO_BUCKET')!;
        const exists = await this.minioClient.bucketExists(bucket);
        if (!exists) {
            await this.minioClient.makeBucket(bucket);
            await this.minioClient.setBucketPolicy(bucket, JSON.stringify({
                "Version": "2012-10-17",
                "Statement": [{
                    "Sid": "PublicReadObjects",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [`arn:aws:s3:::${bucket}/*`]
                }]
            }));
        }
    }

    getClient() {
        return this.minioClient;
    }

    getBucket() {
        return this.configService.get<string>('MINIO_BUCKET')!;
    }
}
```

**功能**：
- 模块初始化时检查 bucket 是否存在，不存在则创建并设置公开读策略
- 提供 `getClient()` 和 `getBucket()` 供业务模块使用

**使用方式**（在 UserService 中上传头像）：

```typescript
const client = this.minioService.getClient();
const bucket = this.minioService.getBucket();
const fileName = `${Date.now()}-${file.originalname}`;
await client.putObject(bucket, fileName, file.buffer, file.size, {
    "Content-Type": file.mimetype
});
```

---

## PayService（支付宝 SDK）

位置：`libs/shared/src/pay/pay.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayService implements OnModuleInit {
    public alipaySdk: AlipaySdk;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.alipaySdk = new AlipaySdk({
            appId: this.configService.get<string>('ALIPAY_APP_ID')!,
            privateKey: this.configService.get<string>('ALIPAY_PRIVATE_KEY')!,
            alipayPublicKey: this.configService.get<string>('ALIPAY_PUBLIC_KEY')!,
            gateway: this.configService.get<string>('ALIPAY_GATEWAY')!,
        });
    }

    getAlipaySdk() {
        return this.alipaySdk;
    }
}
```

**使用方式**：

```typescript
const payUrl = this.sharedPayService.getAlipaySdk().pageExecute(
    'alipay.trade.page.pay', 'GET', { bizContent: { ... } }
);
```

---

## EmailService（邮件服务）

位置：`libs/shared/src/email/email.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements OnModuleInit {
    private transporter: nodemailer.Transporter | null = null;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('EMAIL_HOST'),
            port: Number(this.configService.get<string>('EMAIL_PORT')),
            secure: !!Number(this.configService.get<string>('EMAIL_USE_SSL')),
            auth: {
                user: this.configService.get<string>('EMAIL_USER'),
                pass: this.configService.get<string>('EMAIL_PASSWORD'),
            }
        });
    }

    async sendEmail(to: string, subject: string, text: string) {
        try {
            await this.transporter?.sendMail({
                from: this.configService.get<string>('EMAIL_FROM'),
                to,
                subject,
                html: text,
            });
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
```

---

## 全局拦截器

### InterceptorInterceptor

统一响应格式 + BigInt 安全序列化：

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

const transformBigInt = (data: any): any => {
  if (typeof data === 'bigint') return data.toString();
  if (Array.isArray(data)) return data.map(transformBigInt);
  if (data instanceof Date) return data;
  if (typeof data === 'object' && data !== null)
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, transformBigInt(v)]));
  return data;
};

@Injectable()
export class InterceptorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map((data) => ({
        timestamp: new Date().toISOString(),
        data: transformBigInt(data.data) ?? null,
        path: request.url,
        message: data.message ?? 'success',
        code: data.code ?? 200,
        success: true,
      }))
    );
  }
}
```

### InterceptorExceptionFilter

统一异常响应格式：

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class InterceptorExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    ctx.getResponse().status(exception.getStatus()).json({
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: exception.message,
      code: exception.getStatus(),
      success: false,
    });
  }
}
```

### 在 main.ts 中挂载

```typescript
app.useGlobalInterceptors(new InterceptorInterceptor());
app.useGlobalFilters(new InterceptorExceptionFilter());
```

---

## Express 类型扩展

位置：`server/apps/server/src/type/express.d.ts`

```typescript
import type { TokenPayload } from '@nexura/common/user';

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}
```

---

## 完整环境变量清单

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/nexura"

# JWT
SECRET_KEY="your-secret-key"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL=0
MINIO_BUCKET="avatar"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# 支付宝
ALIPAY_APP_ID="..."
ALIPAY_PRIVATE_KEY="..."
ALIPAY_PUBLIC_KEY="..."
ALIPAY_GATEWAY="https://openapi-sandbox.dl.alipaydev.com/gateway.do"
ALIPAY_NOTIFY_URL="http://公网地址"

# AI
DEEPSEEK_API_KEY="..."
DEEPSEEK_API_MODEL="deepseek-chat"
DEEPSEEK_REASONER_API_MODEL="deepseek-reasoner"
AI_DATABASE_URL="postgresql://..."

# 博查搜索
BOCHA_SEARCH_URL="https://api.bochasearch.com/search"
BOCHA_API_KEY="..."

# 邮件
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=465
EMAIL_USE_SSL=1
EMAIL_USER="your@email.com"
EMAIL_PASSWORD="your-password"
EMAIL_FROM="Nexura <your@email.com>"
```

---

## 后端依赖清单

```bash
# 核心
@nestjs/common @nestjs/core @nestjs/platform-express
@nestjs/config @nestjs/jwt

# 数据库
@prisma/client @prisma/adapter-pg prisma

# 文件存储
minio

# 支付
alipay-sdk

# 队列
@nestjs/bullmq bullmq

# WebSocket
@nestjs/websockets @nestjs/platform-socket.io socket.io

# 邮件
nodemailer

# AI
@langchain/deepseek @langchain/langgraph @langchain/langgraph-checkpoint-postgres

# 工具
nanoid dayjs dotenv

# 开发
tsx @types/nodemailer @types/express
```
