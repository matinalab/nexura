<template>
    <div ref="pageRef" class="relative min-h-screen">
        <div class="scroll-bg" :style="scrollBgStyle" />
        <div class="grid-overlay" :style="{ opacity: gridOpacity }" />

        <div class="page-container relative z-[1] mt-6 pb-20 md:mt-10 md:pb-30">
            <!-- 背景区域 -->
            <div class="relative flex flex-col lg:flex-row justify-between items-center rounded-[24px] p-4 md:p-9 overflow-hidden min-h-[280px]">
                <div class="absolute inset-0 bg-linear-to-br from-[#0f0c29] via-[#1e1b4b] to-[#312e81] rounded-[24px]" />
                <div class="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div class="relative z-8 p-4 md:p-8 max-w-lg">
                    <div class="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
                        <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                        AI 驱动 · 智能学习
                    </div>
                    <div class="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight bg-clip-text text-transparent bg-linear-to-r from-white via-indigo-200 to-indigo-400">通过跟AI对话<br/>提高你的英语水平</div>
                    <div class="text-sm md:text-base pt-4 md:pt-5 text-gray-400 leading-relaxed">超 <span class="text-indigo-300 font-semibold">1,000,000</span> 学员的选择，科学高效地提升英语能力</div>
                    <div class="flex flex-wrap items-center gap-3 pt-6 md:pt-8">
                        <button type="button" @click="showLogin" class="relative bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-7 py-2.5 cursor-pointer text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-900/50 hover:shadow-indigo-700/60 hover:-translate-y-0.5">立即学习</button>
                        <button type="button" @click="scrollToWhy" class="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors duration-200 cursor-pointer">了解更多 <span class="text-xs">→</span></button>
                    </div>
                </div>
                <div class="relative z-8 p-4 md:p-8 hidden sm:block">
                    <Hologram />
                </div>
            </div>

            <!-- 描述区域 -->
            <div ref="whyRef" class="rounded-[20px] p-6 md:p-10 text-center mt-4 scroll-mt-6">
                <div class="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 text-why" :class="coreBadgeClass">为什么选择我们</div>
                <div class="text-2xl md:text-3xl text-why font-extrabold tracking-tight" :class="whyTextClass">AI 学习，真的不一样</div>
                <div class="text-sm md:text-base text-why-content mt-3 max-w-md mx-auto leading-relaxed" :class="whySubTextClass">
                    科学验证：AI 对话式英语学习，效率比传统方式提升 <span class="text-indigo-400 font-semibold">3×</span>，让进步清晰可见。
                </div>
            </div>

            <!-- 数据统计区域 -->
            <div ref="statsRef" class="mt-6 md:mt-10 rounded-[20px] px-6 py-8 md:py-10 grid grid-cols-2 md:flex md:items-center md:justify-between gap-6" :class="isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'">
                <template v-for="(item, index) in stats" :key="item.label">
                    <div class="flex-1 text-center group">
                        <div class="flex items-baseline justify-center gap-0.5">
                            <span class="text-3xl md:text-5xl font-extrabold stat-number tracking-tight" :class="statNumberClass">
                                {{ Math.floor(item.value).toLocaleString() }}
                            </span>
                            <span class="text-xl md:text-3xl font-bold text-indigo-500 ml-0.5">{{ item.suffix }}</span>
                        </div>
                        <div class="mt-2 text-xs font-medium tracking-wide uppercase" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ item.label }}</div>
                    </div>
                    <div v-if="index < stats.length - 1" class="hidden md:block w-px h-12" :class="isDark ? 'bg-indigo-500/20' : 'bg-gray-200'" />
                </template>
            </div>

            <!-- 核心优势标题 -->
            <div class="relative text-center py-8 mb-6">
                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl" :class="coreGlowClass" />
                <div class="relative z-10">
                    <span class="inline-block text-core px-4 py-1.5 text-sm font-medium rounded-full mb-4" :class="coreBadgeClass">
                        ✨ 核心优势
                    </span>
                    <div class="text-3xl font-bold core-title bg-clip-text text-transparent" :class="coreTitleGradient">
                        重新定义英语学习方式
                    </div>
                    <div class="text-base mt-4 mx-auto core-content leading-relaxed" :class="coreContentClass">
                        融合前沿 AI 技术与语言学研究，打造沉浸式学习体验，让每一分钟的学习都更有价值
                    </div>
                </div>
            </div>

            <!-- 核心优势卡片 -->
            <div ref="cardsRef">
                <Suspense v-if="cardsVisible">
                    <CardsSection :abouts="abouts" :dark-mode="isDark" />
                    <template #fallback>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div v-for="i in 3" :key="i" class="card-skeleton rounded-[24px] h-56" />
                        </div>
                    </template>
                </Suspense>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div v-for="i in 3" :key="i" class="card-skeleton rounded-[24px] h-56" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import Hologram from './components/Hologram.vue'
import { useRouter } from 'vue-router'
import { useLogin } from '@/hooks/useLogin'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CardsSection = defineAsyncComponent(() => import('./components/CardsSection.vue'))

const router = useRouter()
const { login } = useLogin()

const pageRef = ref<HTMLElement | null>(null)
const whyRef = ref<HTMLElement | null>(null)
const statsRef = ref<HTMLElement | null>(null)
const cardsRef = ref<HTMLElement | null>(null)

const scrollProgress = ref(0)
const statsVisible = ref(false)
const cardsVisible = ref(false)

const stats = reactive([
    { value: 0, suffix: '+', label: '累计学员', target: 1000000 },
    { value: 0, suffix: '+', label: '精品课程', target: 500 },
    { value: 0, suffix: '%', label: '学员满意度', target: 98 },
    { value: 0, suffix: '+', label: '学习时长(小时)', target: 5000000 }
])

const abouts = [
    { icon: '🖼️', title: 'AI情境学习', content: '沉浸式场景模拟，让你在真实语境中自然习得英语，告别枯燥的死记硬背。' },
    { icon: '🧠', title: '智能对话练习', content: 'AI 实时纠错反馈，个性化对话训练，24小时随时练习口语表达。' },
    { icon: '🎤', title: '科学词汇记忆', content: '基于艾宾浩斯遗忘曲线，智能安排复习计划，让单词真正记住。' },
]

const isDark = computed(() => scrollProgress.value > 0.35)

const scrollBgStyle = computed(() => ({
    opacity: Math.min(scrollProgress.value * 1.6, 0.92),
}))

const gridOpacity = computed(() => {
    const p = scrollProgress.value
    return p > 0.3 ? Math.min((p - 0.3) * 3, 0.15) : 0
})

const whyTextClass = computed(() => isDark.value ? 'text-white' : 'text-gray-800')
const whySubTextClass = computed(() => isDark.value ? 'text-gray-300' : 'text-gray-600')
const statNumberClass = computed(() => isDark.value ? 'text-white' : 'text-gray-800')
const coreGlowClass = computed(() => isDark.value ? 'bg-indigo-500/20' : 'bg-indigo-200/30')
const coreBadgeClass = computed(() => isDark.value ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600')
const coreTitleGradient = computed(() =>
    isDark.value
        ? 'bg-linear-to-r from-white via-indigo-300 to-indigo-400'
        : 'bg-linear-to-r from-gray-800 via-indigo-700 to-indigo-500'
)
const coreContentClass = computed(() => isDark.value ? 'text-gray-400' : 'text-gray-500')

const startCountUp = () => {
    stats.forEach(item => {
        const proxy = { val: 0 }
        countTweens.push(gsap.to(proxy, {
            val: item.target,
            duration: 2,
            ease: 'power2.inOut',
            onUpdate() { item.value = proxy.val }
        }))
    })
}

let statsObserver: IntersectionObserver | null = null
let cardsObserver: IntersectionObserver | null = null
let entranceContext: gsap.Context | null = null
let countTweens: gsap.core.Tween[] = []

const initObservers = () => {
    statsObserver = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !statsVisible.value) {
                statsVisible.value = true
                startCountUp()
                statsObserver?.disconnect()
            }
        },
        { threshold: 0.2 }
    )
    if (statsRef.value) statsObserver.observe(statsRef.value)

    cardsObserver = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !cardsVisible.value) {
                cardsVisible.value = true
                cardsObserver?.disconnect()
            }
        },
        { rootMargin: '200px', threshold: 0 }
    )
    if (cardsRef.value) cardsObserver.observe(cardsRef.value)
}

const handleScroll = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    scrollProgress.value = docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0
}

const initEntrance = () => {
    if (!pageRef.value) return

    entranceContext = gsap.context(() => {
        gsap.fromTo('.text-why', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.6 })
        gsap.fromTo('.text-why-content', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.1 })
        gsap.fromTo('.text-core', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, scrollTrigger: { trigger: '.text-core', start: 'top 70%' } })
        gsap.fromTo('.core-title', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, scrollTrigger: { trigger: '.core-title', start: 'top 70%' } })
        gsap.fromTo('.core-content', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.5, scrollTrigger: { trigger: '.core-content', start: 'top 70%' } })
    }, pageRef.value)
}

const scrollToWhy = () => {
    whyRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const showLogin = async () => {
    try {
        await login()
        router.push('/courses/index')
    } catch { /* 未登录，已弹出登录框 */ }
}

onMounted(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    initObservers()
    initEntrance()
})

onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll)
    statsObserver?.disconnect()
    cardsObserver?.disconnect()
    countTweens.forEach(tween => tween.kill())
    entranceContext?.revert()
})
</script>

<style scoped>
.scroll-bg {
    position: fixed;
    inset: 0;
    background: linear-gradient(160deg, #0d1117 0%, #0f0c29 40%, #1a0533 80%, #0d1117 100%);
    pointer-events: none;
    z-index: 0;
    transition: opacity 0.08s linear;
}

.grid-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
        linear-gradient(rgba(99, 102, 241, 0.4) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99, 102, 241, 0.4) 1px, transparent 1px);
    background-size: 60px 60px;
    transition: opacity 0.3s ease;
}

.card-skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s infinite;
}

@keyframes skeleton-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
</style>