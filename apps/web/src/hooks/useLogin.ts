import { IS_SHOW_LOGIN } from '@/components/Login/type'
import { inject,ref } from 'vue'
import { useUserStore } from '@/stores/user'
import router from '@/router'
export const useLogin = () => {
    const isShowLogin = inject(IS_SHOW_LOGIN,ref(false))
    const userStore = useUserStore()
    const login = () => {
        return new Promise((resolve,reject) => {
            if(userStore.getUser){
                resolve(true) //用户已登录
            }else{
                isShowLogin.value = true //显示登录弹窗
                reject(false)
            }
        })
    }
    const logout = () => {
        userStore.logout() //pinia的值清空
        router.push('/') //跳转到首页
    }
    const hide = () => {
        isShowLogin.value = false
    }
    return {
        login,
        hide,
        logout
    }
}