import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { WebResultUser,Token,UserUpdate } from '@nexura/common/user'
export const useUserStore = defineStore('user', () => {
  //用户信息
  const user = ref<WebResultUser | null>(null) 
  //设置用户信息
  const setUser = (params: WebResultUser) => {
    user.value = params 
  }
  //导出accessToken
  const getAccessToken = computed(() => user.value?.token.accessToken)
  //导出refreshToken
  const getRefreshToken = computed(() => user.value?.token.refreshToken)
  //更新token
  const updateToken = (newToken: Token) => {
    user.value!.token = newToken
  }
  //更新用户单词数量
  const updateUserWordNumber = (wordNumber: number) => {
    user.value!.wordNumber = wordNumber
  }
  //点击完成保存之后更新用户信息
  const updateUser = (params: UserUpdate) => {
     user.value!.name = params.name //名字
     user.value!.email = params.email //邮箱
     user.value!.address = params.address //地址
     user.value!.avatar = params.avatar //头像
     user.value!.bio = params.bio //签名
     user.value!.isTimingTask = params.isTimingTask //是否开启定时任务
     user.value!.timingTaskTime = params.timingTaskTime //定时任务时间
  }
  //在设置界面默认获取的值
  const getUpdateUserInfo = computed<UserUpdate>(() => {
    return {
      name: user.value!.name,
      email: user.value!.email,
      address: user.value!.address,
      avatar: user.value!.avatar,
      bio: user.value!.bio,
      isTimingTask: user.value!.isTimingTask,
      timingTaskTime: user.value!.timingTaskTime,
    }
  })
  //获取用户信息
  const getUser = computed(() => user.value) 
  //退出登录
  const logout = () => {
    user.value = null 
  }
  return { user, setUser, getUser, logout, getAccessToken, getRefreshToken, updateToken,updateUser,getUpdateUserInfo,updateUserWordNumber }
}, { persist: true }) //持久化存储localStorage
