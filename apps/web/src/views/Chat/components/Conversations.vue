<template>
    <div
        class="p-3 lg:p-5 rounded-[5px] w-full lg:w-[256px] lg:shrink-0 bg-purple-50 border border-gray-200 lg:border-r lg:border-t-0 lg:border-b-0 lg:border-l-0 flex lg:flex-col flex-row overflow-x-auto gap-2 lg:gap-0">
        <div @click="changeActive(value)" :class="{ 'bg-purple-300': active === value.id }"
            class="rounded-[5px] p-2 transition-all duration-300 shrink-0 lg:shrink" v-for="value in chatMode"
            :key="value.id">
            <div class="text-sm cursor-pointer p-2 px-4 text-gray-700 whitespace-nowrap">
                {{ value.label }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ChatModeList, ChatMode } from '@nexura/common/chat';
import { getChatMode } from '@/apis/chat';
const emits = defineEmits(['onGetRole'])
const chatMode = ref<ChatModeList>([]) //消息模式列表
const active = ref<string | null>(null) //当前激活的id
//切换消息模式
const changeActive = (value:ChatMode) => {
    active.value = value.id
    emits('onGetRole', value.role) //派发role
}
//获取消息模式列表
const getChatModeList = async () => {
    const res = await getChatMode()
    chatMode.value = res.data
    active.value = res.data[0].id //默认选中第一个
    emits('onGetRole', res.data[0].role) //派发role
}
onMounted(() => {
    getChatModeList()
})
</script>
