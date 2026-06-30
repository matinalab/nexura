<template>
    <div v-if="isShowLogin" class="fixed inset-0 bg-black opacity-30 filter blur-sm z-40"></div>
    <Transition name="fade">
        <div v-if="isShowLogin" class="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
                class="relative w-full max-w-[1200px] max-h-[90vh] lg:h-[700px] bg-white rounded-[20px] shadow-2xl overflow-hidden flex flex-col lg:flex-row overflow-y-auto">
                <!-- 关闭按钮 -->
                <button @click="isShowLogin = false"
                    class="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <!-- 左侧 3D 模型区域（桌面端） -->
                <ModelViewer @changeType="changeType" ref="modelViewerRef" class="hidden lg:block" />

                <!-- 登录表单区域 -->
                <div class="flex-1 flex flex-col justify-center px-6 md:px-12 py-8 md:py-10 bg-white">
                    <!-- 移动端登录/注册切换 -->
                    <div class="lg:hidden flex items-center gap-2 bg-gray-100 rounded-lg p-1 mb-6 w-fit mx-auto">
                        <button @click="changeType('login')"
                            :class="loginType === 'login' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all">
                            登录
                        </button>
                        <button @click="changeType('register')"
                            :class="loginType === 'register' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'"
                            class="px-4 py-1.5 rounded-md text-sm font-medium transition-all">
                            注册
                        </button>
                    </div>

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
