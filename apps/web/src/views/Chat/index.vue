<template>
    <div class="w-[1200px] mx-auto flex mt-10">
        <Conversations @onGetRole="getRole" />
        <Bubble :list="list" @onSendMessage="sendMessage" />
    </div>
</template>
<script setup lang="ts">
import Conversations from './components/Conversations.vue';
import Bubble from './components/Bubble.vue';
import { useUserStore } from '@/stores/user'
import { ref } from 'vue';
import { getChatHistory } from '@/apis/chat';
import type { ChatRoleType, ChatMessageList, ChatDto, ChatMessage } from '@nexura/common/chat';
import { sse, CHAT_URL } from '@/apis/sse';
const userStore = useUserStore()
const list = ref<ChatMessageList>([]) //存储历史记录的数组
const userId = userStore.user?.id
const role = ref<ChatRoleType>('normal') //存储角色
const getRole = async (params: ChatRoleType) => {
    role.value = params
    const res = await getChatHistory(userId!, params) //获取历史记录
    list.value = res.data //存储历史记录
}
const sendMessage = (message: string, deepThink: boolean, webSearch: boolean) => {
    list.value.push({role: 'human', content: message, type: 'chat'}) //添加用户的消息
    list.value.push({role: 'ai', content: '',reasoning:'' ,type: 'chat'}) //添加AI的消息
    sse<ChatMessage, ChatDto>(CHAT_URL, "POST", {role: role.value, content: message, userId: userId!,deepThink,webSearch
    }, (data) => {
        if(data.type === 'reasoning'){
            list.value[list.value.length - 1].reasoning += data.content
        }
        if(data.type === 'chat'){   
            list.value[list.value.length - 1].content += data.content
        }
    })
}
</script>