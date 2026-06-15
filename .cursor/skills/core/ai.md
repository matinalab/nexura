---
triggers:
  - AI 对话
  - Chat
  - 流式输出
  - LangChain
  - DeepSeek
  - BullMQ
  - 定时任务
  - 邮件推送
  - AI 分析
  - 流式响应
  - stream
---

# AI 服务开发指南（Langchain + DeepSeek）

本文档说明如何开发 AI 相关功能，包括 Chat 对话、历史记录、流式响应、Tool 调用、定时摘要等。

---

## AI 服务架构

项目中 AI 功能独立为 `server/apps/ai` 应用，与主服务 `server/apps/server` 并行运行。

```
server/apps/
├── server/          # 主服务 :3000
└── ai/              # AI 服务 :3001
    ├── src/
    │   ├── chat/       # Chat 对话
    │   ├── prompt/     # 提示词管理
    │   ├── digest/     # 定时摘要
    │   ├── llm/        # LLM 配置
    │   └── ai.module.ts
    └── main.ts
```

---

## LLM 配置（llm.config.ts）

### 初始化 DeepSeek 模型

```typescript
import { ChatDeepSeek } from '@langchain/deepseek';
import { ConfigService } from '@nestjs/config';

export const createDeepSeek = () => {
    const configService = new ConfigService();
    return new ChatDeepSeek({
        apiKey: configService.get<string>('DEEPSEEK_API_KEY'),
        model: configService.get<string>('DEEPSEEK_API_MODEL'),
        temperature: 1.3,
        maxTokens: 4396,
        streaming: true,
    });
};
```

### 深度思考模型

```typescript
export const createDeepSeekReasoner = () => {
    const configService = new ConfigService();
    return new ChatDeepSeek({
        apiKey: configService.get<string>('DEEPSEEK_API_KEY'),
        model: configService.get<string>('DEEPSEEK_REASONER_API_MODEL'),
        temperature: 1.3,
        maxTokens: 18000,
        streaming: true,
    });
};
```

### Checkpoint（历史记录管理）

```typescript
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

export const createCheckpoint = async () => {
    const configService = new ConfigService();
    const checkpointer = PostgresSaver.fromConnString(
        configService.get<string>('AI_DATABASE_URL')!
    );
    await checkpointer.setup();  // 初始化表结构
    return checkpointer;
};
```

### 联网搜索增强（博查搜索 API）

```typescript
export const createBochaSearch = async (query: string, count: number = 10) => {
    const configService = new ConfigService();
    const result = await fetch(configService.get<string>('BOCHA_SEARCH_URL')!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${configService.get<string>('BOCHA_API_KEY')}`,
        },
        body: JSON.stringify({ query, count, summary: true }),
    });
    const { data } = await result.json();
    const values = data.webPages.value;
    const prompt = values.map(item => `
       标题：${item.name}
       链接：${item.url}
       摘要：${item?.summary?.replace(/\n/g, '') ?? ''}
       网站名称：${item.siteName}
       发布时间：${item.dateLastCrawled}
    `).join('\n');
    return prompt;
};
```

---

## Chat Service（对话服务）

### 初始化 Checkpoint

```typescript
@Injectable()
export class ChatService implements OnModuleInit {
  constructor(private readonly responseService: ResponseService) {}
  private checkpointer: PostgresSaver;

  async onModuleInit() {
    this.checkpointer = await createCheckpoint();
  }
}
```

### 流式对话

```typescript
async streamCompletion(createChatDto: ChatDto) {
    const promptObject = chatMode.find(item => item.role === createChatDto.role);
    if (!promptObject) throw new Error('模式不存在');

    let prompt = promptObject.prompt;

    // 开启联网搜索
    if (createChatDto.webSearch) {
        const webSearchPrompt = await createBochaSearch(createChatDto.content);
        prompt += `请根据以下搜索结果回答问题：${webSearchPrompt}，用户问题：${createChatDto.content}`;
    }

    // 选择模型
    let model = createDeepSeek();
    if (createChatDto.deepThink) {
        model = createDeepSeekReasoner();
    }

    const agent = createAgent({
        model,
        systemPrompt: prompt,
        checkpointer: this.checkpointer,
    });

    // 会话隔离
    const id = `${createChatDto.userId}-${createChatDto.role}`;
    const stream = agent.stream({
        messages: [{ role: 'human', content: createChatDto.content }]
    }, {
        configurable: { thread_id: id },
        streamMode: 'messages',
    });

    return stream;
}
```

### 查询历史记录

```typescript
async findAll(userId: string, role: ChatRoleType) {
    const messages = await this.checkpointer.get({
        configurable: { thread_id: `${userId}-${role}` }
    });
    const list = messages?.channel_values?.messages as AIMessageChunk[];
    if (!list) return this.responseService.success([]);
    return this.responseService.success(list.map(item => ({
        content: item.content,
        role: item.type,
        reasoning: item.additional_kwargs?.reasoning_content,
    })));
}
```

---

## Chat Controller（SSE 流式响应）

### 流式输出

```typescript
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async create(@Body() createChatDto: ChatDto, @Res() res: Response) {
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.chatService.streamCompletion(createChatDto);

    for await (const chunk of stream) {
      const [msg] = chunk;
      
      // 深度思考内容
      const thinkMsg = msg.additional_kwargs?.reasoning_content ?? '';
      if (thinkMsg) {
        res.write(`data: ${JSON.stringify({content: thinkMsg, role: 'ai', type: 'reasoning'})}\n\n`);
      }

      // 普通对话内容
      const content = msg.content ?? '';
      if (content) {
        res.write(`data: ${JSON.stringify({content, role: 'ai', type: 'chat'})}\n\n`);
      }
    }

    res.end();
  }

  @Get('history')
  findAll(@Query('userId') userId: string, @Query('role') role: ChatRoleType) {
    return this.chatService.findAll(userId, role);
  }
}
```

**关键点**:
- 用 `@Res()` 直接操作响应对象
- SSE 格式：`data: {...}\n\n`
- 必须在最后调用 `res.end()`

---

## Langchain Tool（自定义工具）

### 定义工具

```typescript
import { tool } from '@langchain/core/tools';

private queryTool() {
    return tool(async ({ userId }: { userId: string }) => {
        const user = await this.prismaService.user.findFirst({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                wordNumber: true,
                wordBookRecords: {
                    where: {
                        createdAt: {
                            gte: dayjs().startOf('day').toDate(),
                            lte: dayjs().add(1, 'day').startOf('day').toDate(),
                        }
                    },
                    select: {
                        word: { select: { word: true } }
                    }
                }
            }
        });
        return user;
    }, {
        name: 'queryTool',
        description: '根据用户id查询用户学习的单词记录',
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string', description: '用户id' },
            },
            required: ['userId']
        }
    });
}
```

### 使用工具

```typescript
const agent = createAgent({
    model: createDeepSeek(),
    tools: [this.queryTool()],
    systemPrompt: '你是一个单词记忆助手',
});

const result = await agent.invoke({
    messages: [{ role: 'user', content: `查询用户信息，用户id: ${userId}` }]
});
```

---

## 定时摘要任务（BullMQ + Cron）

### 注册定时任务

```typescript
@Injectable()
export class DigestService implements OnModuleInit {
  constructor(
    @InjectQueue('DIGEST_QUEUE') private readonly digestQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.digestQueue.add('EVERY_DAY_DIGEST_TASK', {}, {
      repeat: {
        pattern: '0 0 * * *',  // 每天 0 点执行
      }
    });
  }
}
```

### 延迟任务

```typescript
this.digestQueue.add('EMAIL_DIGEST_TASK', {
    userId: user.id,
    text: html,
    email: user.email,
}, {
    delay: delayMs  // 延迟指定时间后执行
});
```

### 消费者（Processor）

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('DIGEST_QUEUE')
export class DigestProcessor extends WorkerHost {
  constructor(
    private readonly digestService: DigestService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'EMAIL_DIGEST_TASK') {
      const { text, email } = job.data;
      await this.emailService.sendEmail(email, '每日单词记忆报告', text);
    }

    if (job.name === 'EVERY_DAY_DIGEST_TASK') {
      await this.digestService.handleEmailDigest();
    }
  }
}
```

---

## 邮件服务（Nodemailer）

### 初始化

```typescript
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

## 环境变量配置

`.env` 新增:

```env
# AI
DEEPSEEK_API_KEY="your-key"
DEEPSEEK_API_MODEL="deepseek-chat"
DEEPSEEK_REASONER_API_MODEL="deepseek-reasoner"
AI_DATABASE_URL="postgresql://..."

# 博查搜索
BOCHA_SEARCH_URL="https://api.bochasearch.com/search"
BOCHA_API_KEY="your-key"

# 邮件
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=465
EMAIL_USE_SSL=1
EMAIL_USER="your@email.com"
EMAIL_PASSWORD="your-password"
EMAIL_FROM="Nexura <your@email.com>"
```

---

## 前端接入（SSE）

```typescript
import { fetchEventSource } from '@microsoft/fetch-event-source';

await fetchEventSource('/ai/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '你好', userId, role: 'chat' }),
  onmessage(ev) {
    const data = JSON.parse(ev.data);
    if (data.type === 'reasoning') {
      // 显示深度思考过程
    } else {
      // 显示普通对话
    }
  }
});
```

---

## 启动 AI 服务

```bash
# 根目录
pnpm ai

# 或在 server/ 目录
nest start --watch ai
```

AI 服务默认运行在 `http://localhost:3001`，前端通过 Vite proxy 的 `/ai` 路径转发。
