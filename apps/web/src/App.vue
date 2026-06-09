<template>
  <RouterView />
  <Search />
  <Login />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Search from './components/Search/index.vue'
import Login from './components/Login/index.vue'
import { provide, ref, watch } from 'vue'
import { IS_SHOW_LOGIN } from './components/Login/type'
provide(IS_SHOW_LOGIN, ref(false)) // 是否显示登录框 并且扩展为全局调用 默认不显示
import { useSocket } from './hooks/useSocket'
import { useUserStore } from './stores/user'
import { Tracker } from '@nexura/tracker'

const tracker = new Tracker({
    baseUrl: '/api/v1',
    uv: {
        api: '/tracker/uv',
        updateApi: '/tracker/update-uv'
    },
    pv: {
        api: '/tracker/pv'
    },
    event: {
        api: '/tracker/event'
    },
    error: {
        api: '/tracker/error'
    },
    performance: {
        api: '/tracker/performance'
    }
})

const userStore = useUserStore()

const { connect, disconnect } = useSocket()
watch(() => userStore.user?.id, (newVal) => {
  if (newVal) {
    tracker.setUserId(newVal)
    connect();
  } else {
    disconnect();
  }
}, { immediate: true })
</script>
