<template>
    <div ref="cardsContainerRef" class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
            v-for="(item, index) in abouts"
            :key="item.title"
            class="about-card group cursor-pointer rounded-[20px] border p-8 transition-all duration-300 hover:-translate-y-1"
            :class="darkMode
                ? 'border-white/[0.08] bg-white/[0.04] hover:border-indigo-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
                : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-[0_8px_24px_rgba(99,102,241,0.08)]'"
            :style="{ animationDelay: `${index * 100}ms` }"
        >
            <div
                class="mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition-all duration-300"
                :class="darkMode ? 'bg-indigo-500/15' : 'bg-indigo-50 group-hover:bg-indigo-100'"
            >
                {{ item.icon }}
            </div>

            <div class="mb-2 text-lg font-bold" :class="darkMode ? 'text-white' : 'text-gray-800'">
                {{ item.title }}
            </div>
            <div class="text-sm leading-relaxed" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
                {{ item.content }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

defineProps<{
    abouts: { icon: string; title: string; content: string }[]
    darkMode: boolean
}>()

const cardsContainerRef = ref<HTMLElement | null>(null)
let animationContext: gsap.Context | null = null

onMounted(() => {
    if (!cardsContainerRef.value) return

    animationContext = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>('.about-card')
        cards.forEach((card, index) => {
            gsap.fromTo(
                card,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.45,
                    delay: index * 0.1,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: cardsContainerRef.value, start: 'top 75%' },
                }
            )
        })
    }, cardsContainerRef.value)
})

onBeforeUnmount(() => animationContext?.revert())
</script>
