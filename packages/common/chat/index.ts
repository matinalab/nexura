export type ChatRole = 'human' | 'ai'; //角色 human: 用户 ai: 助手 langchain框架的枚举
export type ChatRoleType = 'normal' | 'master' | 'kouhai' | 'matinal'; //角色类型
export type ChatMessageType = 'reasoning' | 'chat'; //消息类型 reasoning: 推理 chat: 聊天
//消息列表的对象类型
export type ChatMessage = {
    role:ChatRole //角色 human: 用户 ai: 助手
    content:string; //Chat聊天所返回的内容
    reasoning?:string; //深度思考所返回的内容
    type:ChatMessageType // reasoning: 深度思考的一个状态 chat: 聊天的状态
}
//消息列表
export type ChatMessageList = ChatMessage[]

//定义左侧消息模式的对象
export type ChatMode = {
    label:string; //标签
    id:string; //id
    role:ChatRoleType; //角色
}
//左侧消息模式列表
export type ChatModeList = ChatMode[]


//定义发送消息的类型
export type ChatDto = {
    deepThink:boolean; //深度思考
    webSearch:boolean; //联网搜索
    role:ChatRoleType; //角色
    content:string; //内容
    userId:string; //用户id
}

//会话隔离 线程id userId-role  userId:123 role:normal 线程id:123-normal
//查询历史记录 线程id查询 123-normal 查询出123-normal的记录