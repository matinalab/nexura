---
triggers:
  - Prisma 事务
  - 支付宝支付
  - 支付回调
  - 双 Token
  - 刷新 token
  - refresh token
  - 事务
  - transaction
---

# Prisma 高级用法与支付宝、Socket 进阶

本文档补充 `patterns.md` 未覆盖的高级功能。

---

## Prisma 事务与批量操作

### 1. 事务（$transaction）

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  const payment = await tx.paymentRecord.update({
    where: { outTradeNo },
    data: {
      tradeStatus: TradeStatus.TRADE_SUCCESS,
      tradeNo: alipayTradeNo,
      sendPayTime: new Date(),
    },
  });

  await tx.courseRecord.create({
    data: {
      userId,
      courseId,
      isPurchased: true,
      paymentRecordId: payment.id,
    },
  });

  return payment;
});
```

### 2. 批量创建（createMany）

```typescript
const records = wordIds.map(wordId => ({ wordId, userId, isMaster: true }));
await this.prisma.wordBookRecord.createMany({ data: records });
```

### 3. 字段自增（increment）

```typescript
await this.prisma.user.update({
  where: { id: userId },
  data: { wordNumber: { increment: 10 } },
});
```

### 4. 嵌套 where 条件（some / none / every）

```typescript
// 今天学过单词的用户
const users = await this.prisma.user.findMany({
  where: {
    wordBookRecords: {
      some: {
        createdAt: {
          gte: dayjs().startOf('day').toDate(),
          lte: dayjs().add(1, 'day').startOf('day').toDate(),
        }
      }
    }
  }
});

// 还没学过的单词
const words = await this.prisma.wordBook.findMany({
  where: {
    wordBookRecords: { none: { userId } }
  }
});
```

---

## Socket.IO 房间管理

### 后端：用户加入房间

```typescript
@WebSocketGateway({ cors: { origin: '*' } })
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(`user_${userId}`);
    }
  }

  emitPaymentSuccess(userId: string) {
    this.server.to(`user_${userId}`).emit('paymentSuccess', userId);
  }
}
```

### 前端：useSocket hook

```typescript
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const useSocket = () => {
  const connect = () => {
    const userId = userStore.user?.id;
    if (!userId || socket) return;

    socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true,
      query: { userId },
    });

    if (import.meta.hot) {
      import.meta.hot.data.socket = socket;
    }
  };

  const getSocket = () => socket ?? (import.meta.hot?.data.socket ?? null);

  return { connect, getSocket };
};
```

---

## 支付宝集成

### 生成订单号

```typescript
import * as nanoid from 'nanoid';

private createTradeNo() {
  return `XM-${nanoid.nanoid(12)}`;
}
```

### 创建支付

```typescript
async create(dto: CreatePayDto, user: TokenPayload) {
  const result = await this.prisma.$transaction(async (tx) => {
    const outTradeNo = this.createTradeNo();
    await tx.paymentRecord.create({
      data: {
        userId: user.userId,
        outTradeNo,
        amount: dto.total_amount,
        subject: dto.subject,
        body: dto.body,
      },
    });

    const dateTime = dayjs().add(30, 'minute');
    const payUrl = this.sharedPayService.getAlipaySdk().pageExecute(
      'alipay.trade.page.pay',
      'GET',
      {
        bizContent: {
          out_trade_no: outTradeNo,
          total_amount: dto.total_amount,
          subject: dto.subject,
          body: JSON.stringify({ courseId: dto.courseId, userId: user.userId }),
          product_code: 'FAST_INSTANT_TRADE_PAY',
          time_expire: dateTime.format('YYYY-MM-DD HH:mm:ss'),
        },
        notify_url: `${this.configService.get('ALIPAY_NOTIFY_URL')}/api/v1/pay/notify`,
      }
    );

    return { payUrl, timeExpire: dateTime.toDate().getTime() };
  });

  return this.response.success(result);
}
```

### 支付回调（@All 装饰器）

```typescript
@All('notify')
notify(@Req() req: Request) {
  return this.payService.notify(req);
}

async notify(req: Request) {
  await this.prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.update({
      where: { outTradeNo: req.body.out_trade_no },
      data: {
        tradeNo: req.body.trade_no,
        tradeStatus: TradeStatus.TRADE_SUCCESS,
        sendPayTime: dayjs(req.body.gmt_payment).toDate(),
      },
    });

    const body = JSON.parse(req.body.body);
    await tx.courseRecord.create({
      data: {
        userId: body.userId,
        courseId: body.courseId,
        isPurchased: true,
        paymentRecordId: payment.id,
      },
    });

    this.socketGateway.emitPaymentSuccess(body.userId);
  });

  return true;
}
```

---

## 双 Token 认证

### 生成

```typescript
generateToken(payload: TokenPayload): Token {
  return {
    accessToken: this.jwtService.sign({ ...payload, tokenType: 'access' }),
    refreshToken: this.jwtService.sign(
      { ...payload, tokenType: 'refresh' },
      { expiresIn: '7d' }
    ),
  };
}
```

### 刷新

```typescript
async refreshToken(dto: { refreshToken: string }) {
  const decoded = this.jwtService.verify<RefreshTokenPayload>(dto.refreshToken);
  if (decoded.tokenType !== 'refresh') {
    return this.response.error(null, 'refreshToken 无效');
  }

  const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) return this.response.error(null, '用户不存在');

  const token = this.authService.generateToken({
    userId: user.id,
    name: user.name,
    email: user.email,
  });
  return this.response.success(token);
}
```
