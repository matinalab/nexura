<template>
    <div v-if="isShowLogin" class="fixed inset-0 bg-black opacity-30 filter blur-sm z-40"></div>
    <Transition name="fade">
        <div v-if="isShowLogin" class="fixed inset-30  flex items-center justify-center z-50">
            <div class="relative w-[1200px] h-[700px] bg-white rounded-[20px] shadow-2xl overflow-hidden flex">
                <!-- 关闭按钮 -->
                <button @click="isShowLogin = false" class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <!-- 左侧 3D 模型区域 -->
                <ModelViewer @changeType="changeType" ref="modelViewerRef" />

                <!-- 右侧登录表单区域 -->
                <div class="flex-1 flex flex-col justify-center px-12 py-10 bg-white">
                    
                    <LoginForm v-if="loginType === 'login'" />
                    <RegisterForm v-if="loginType === 'register'" />
                    <div class="mt-6 text-center">
                        <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
                            <span class="cursor-pointer hover:text-indigo-600 transition-colors">忘记密码？</span>
                            <span class="text-gray-300">|</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import ModelViewer from './ModelViewer.vue'
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'
import { ref, inject } from 'vue'
import { IS_SHOW_LOGIN } from './type'
import type { LoginType } from './type'
const isShowLogin = inject(IS_SHOW_LOGIN, ref(false))
const loginType = ref<LoginType>('login')
//1. pinia
//2. event bus
//3. provide/inject
const changeType = (url: LoginType) => {
    loginType.value = url
}
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        isShowLogin.value = false
    }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
