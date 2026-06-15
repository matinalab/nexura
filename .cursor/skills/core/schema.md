---
triggers:
  - 从零复刻
  - 完整 Schema
  - 建表
  - Prisma Schema 全量
  - 复刻项目
---

# 完整 Prisma Schema

Nexura 项目的完整数据库 Schema，用于从零复刻时建表。

日常开发新增 Model 见 `core/backend.md`。

---

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../libs/shared/src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum TradeStatus {
  NOT_PAY
  WAIT_BUYER_PAY
  TRADE_CLOSED
  TRADE_SUCCESS
  TRADE_FINISHED
}

model User {
  id              String           @id @default(cuid())
  name            String
  email           String?          @unique
  phone           String           @unique
  address         String?
  password        String
  avatar          String?
  bio             String?
  isTimingTask    Boolean          @default(false)
  timingTaskTime  String           @default("00:00:00")
  wordNumber      Int              @default(0)
  dayNumber       Int              @default(0)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  lastLoginAt     DateTime?
  wordBookRecords WordBookRecord[]
  paymentRecords  PaymentRecord[]
  courseRecords   CourseRecord[]
  visitors        Visitor[]
}

model WordBook {
  id              String           @id @default(cuid())
  word            String
  phonetic        String?
  definition      String?
  translation     String?
  pos             String?
  collins         String?
  oxford          String?
  tag             String?
  bnc             String?
  frq             String?
  exchange        String?
  gk              Boolean?
  zk              Boolean?
  gre             Boolean?
  toefl           Boolean?
  ielts           Boolean?
  cet6            Boolean?
  cet4            Boolean?
  ky              Boolean?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  wordBookRecords WordBookRecord[]

  @@index([word])
  @@index([tag])
  @@index([word, tag])
}

model WordBookRecord {
  id        String   @id @default(cuid())
  wordId    String
  isMaster  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  word      WordBook @relation(fields: [wordId], references: [id], onDelete: Cascade)

  @@unique([userId, wordId])
}

model Course {
  id            String        @id @default(cuid())
  name          String
  value         String
  description   String?
  teacher       String
  url           String
  price         Decimal
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  courseRecords CourseRecord[]
}

model CourseRecord {
  id              String         @id @default(cuid())
  userId          String
  courseId        String
  isPurchased     Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  paymentRecordId String?
  paymentRecord   PaymentRecord? @relation(fields: [paymentRecordId], references: [id], onDelete: Cascade)
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  course          Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}

model PaymentRecord {
  id            String        @id @default(cuid())
  userId        String
  tradeNo       String?
  outTradeNo    String        @unique
  amount        Decimal
  subject       String
  body          String
  tradeStatus   TradeStatus   @default(NOT_PAY)
  sendPayTime   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseRecords CourseRecord[]

  @@index([tradeNo])
}

model Visitor {
  id                 String             @id @default(cuid())
  anonymousId        String             @unique
  userId             String?
  user               User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  browser            String?
  os                 String?
  device             String?
  pageViews          PageView[]
  trackEvents        TrackEvent[]
  performanceEntries PerformanceEntry[]
  errorEntries       ErrorEntry[]

  @@index([userId])
  @@index([anonymousId])
}

model PageView {
  id        String   @id @default(cuid())
  visitorId String
  visitor   Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  url       String
  referrer  String?
  path      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([visitorId, createdAt])
  @@index([path, createdAt])
}

model TrackEvent {
  id        String   @id @default(cuid())
  visitorId String
  visitor   Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  event     String
  payload   Json?
  url       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([visitorId, createdAt])
  @@index([event, createdAt])
}

model PerformanceEntry {
  id        String   @id @default(cuid())
  visitorId String
  visitor   Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  fp        Float?
  fcp       Float?
  lcp       Float?
  inp       Float?
  cls       Float?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([fp, createdAt])
  @@index([fcp, createdAt])
  @@index([lcp, createdAt])
  @@index([inp, createdAt])
  @@index([cls, createdAt])
  @@index([fp, fcp, lcp, inp, cls, createdAt])
}

model ErrorEntry {
  id        String   @id @default(cuid())
  visitorId String
  visitor   Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)
  error     String
  message   String?
  stack     String?
  url       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([visitorId, createdAt])
  @@index([error, createdAt])
}
```
