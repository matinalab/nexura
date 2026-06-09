import { Injectable, OnModuleInit } from '@nestjs/common';
import { createDeepSeek, createCheckpoint, createDeepSeekReasoner ,createBochaSearch} from '../llm/llm.config';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ChatRoleType, ChatDto } from '@nexura/common/chat';
import type { AIMessageChunk, ReactAgent } from 'langchain';
import { chatMode } from '../prompt/prompt.mode';
import { createAgent } from 'langchain'
import { ResponseService } from '@libs/shared';
@Injectable()
export class ChatService implements OnModuleInit {
  constructor(private readonly responseService: ResponseService) { }
  private checkpointer: PostgresSaver
  async onModuleInit() {
    //1.初始化这个checkpoint
    this.checkpointer = await createCheckpoint() //幂等性
  }

  async streamCompletion(createChatDto: ChatDto) {
    const promptObject = chatMode.find(item => item.role === createChatDto.role)
    if(!promptObject) {
      throw new Error('模式不存在')
    }
    //拿到基础提示词
    let prompt = promptObject.prompt
    //如果开启了联网搜索增强提示词
    if(createChatDto.webSearch){
      const webSearchPrompt = await createBochaSearch(createChatDto.content)
      prompt += `请根据以下搜索结果回答问题：${webSearchPrompt}(并且返回你参考的网站名称)，用户问题：${createChatDto.content}`
    }
    let model = createDeepSeek() //默认是对话模型
    if(createChatDto.deepThink){
      model = createDeepSeekReasoner() //深度思考模型
    }
    const agent = createAgent({
      model: model,
      systemPrompt: prompt,
      checkpointer: this.checkpointer,
    })
    //2.组装消息格式
    const id = `${createChatDto.userId}-${createChatDto.role}`
    const stream = agent.stream({
      messages: [{ role: 'human', content: createChatDto.content }]
    }, {
      configurable: { thread_id: id }, //用于做会话隔离 + 历史记录存储
      streamMode: "messages" //流式输出模式
    })
    return stream //返回的是一个迭代器
  }

  async findAll(userId: string, role: ChatRoleType) {
    const messages = await this.checkpointer.get({
      configurable: { thread_id: `${userId}-${role}` }
    })
    const list = messages?.channel_values?.messages as AIMessageChunk[]
    if(!list) return this.responseService.success([]) //如果历史记录为空，则返回空数组
    return this.responseService.success(list.map(item => ({
      content: item.content,
      role: item.type,
      reasoning: item.additional_kwargs?.reasoning_content, //返回深度思考的内容
    })))
  }
}
