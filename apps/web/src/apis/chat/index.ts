import { aiApi, type Response } from '..'
import type { ChatModeList, ChatRoleType, ChatMessageList } from '@nexura/common/chat'
//获取消息模式列表
export const getChatMode = () => aiApi.get('/prompt/list') as Promise<Response<ChatModeList>>
//获取历史记录
export const getChatHistory = (userId: string,role: ChatRoleType) => aiApi.get(`/chat/history?userId=${userId}&role=${role}`) as Promise<Response<ChatMessageList>>