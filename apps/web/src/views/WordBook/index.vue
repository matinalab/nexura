<template>
    <div class="page-container mt-4 mb-4 md:mt-10 bg-linear-to-br from-blue-50 to-indigo-50 rounded-[20px] p-4 md:p-10 lg:p-20 shadow-lg">
        <div class="mb-6 md:mb-10">
            <div class="flex items-center gap-2">
                <el-icon color="#2563EB" size="20">
                    <Reading />
                </el-icon>
                <span class="text-xl md:text-2xl font-bold text-gray-800">词库列表</span>
            </div>
            <div class="text-xs md:text-sm text-gray-600 mt-2">词典来源：牛津、柯林斯、BNC、FRQ、高考、中考、GRE、TOEFL、IELTS、大学英语六级、大学英语四级、考研</div>
        </div>
        <div class="flex flex-wrap items-center gap-3 md:gap-4 mb-6 md:mb-10">
            <el-input @keyup.enter="searchWord" class="w-full sm:w-auto sm:flex-1 sm:max-w-xs" v-model="query.word"
                placeholder="请输入单词"></el-input>
            <div class="flex flex-wrap items-center gap-2">
                <el-checkbox v-model="query.gk">高考</el-checkbox>
                <el-checkbox v-model="query.zk">中考</el-checkbox>
                <el-checkbox v-model="query.gre">GRE</el-checkbox>
                <el-checkbox v-model="query.toefl">TOEFL</el-checkbox>
                <el-checkbox v-model="query.ielts">IELTS</el-checkbox>
                <el-checkbox v-model="query.cet6">六级</el-checkbox>
                <el-checkbox v-model="query.cet4">四级</el-checkbox>
                <el-checkbox v-model="query.ky">考研</el-checkbox>
            </div>
            <el-button @click="searchWord" type="primary">搜索</el-button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div class="bg-white hover:bg-blue-50 border border-blue-200 text-gray-800 rounded-[10px] p-4 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md min-h-[180px] md:h-[220px]"
                v-for="item in list" :key="item.id">
                <div class="">
                    <div class="text-sm font-semibold text-blue-600 mb-1">{{ item.word }}</div>
                    <div class="text-sm text-gray-500 mb-1 flex items-center gap-2">{{ item.phonetic }} <el-icon
                            size="18" color="#2563EB" @click="playAudio(item.word)">
                            <VideoPlay />
                        </el-icon></div>
                    <div class="text-sm text-gray-700 mb-1 overflow-hidden line-clamp-2">{{ item.definition }}</div>
                    <div v-html="item.translation" class="text-sm text-gray-600 mb-1 overflow-hidden line-clamp-2">
                    </div>
                    <div class="text-sm text-gray-600 mt-3 flex items-center gap-2 flex-wrap">
                        <el-tag v-if="item.gk" type="primary" size="small">高考</el-tag>
                        <el-tag v-if="item.zk" type="primary" size="small">中考</el-tag>
                        <el-tag v-if="item.gre" type="primary" size="small">GRE</el-tag>
                        <el-tag v-if="item.toefl" type="primary" size="small">TOEFL</el-tag>
                        <el-tag v-if="item.ielts" type="primary" size="small">IELTS</el-tag>
                        <el-tag v-if="item.cet6" type="primary" size="small">六级</el-tag>
                        <el-tag v-if="item.cet4" type="primary" size="small">四级</el-tag>
                        <el-tag v-if="item.ky" type="primary" size="small">考研</el-tag>
                    </div>
                </div>
            </div>
        </div>
        <el-pagination class="mt-6 md:mt-10 flex-wrap" background v-model:current-page="query.page"
            v-model:page-size="query.pageSize" :total="total" @current-change="getList" @size-change="getList"
            layout="total, prev, pager, next" :small="isSmallScreen" :pager-count="isSmallScreen ? 5 : 7" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getWordBookList } from '@/apis/word-book'
import type { WordQuery, WordList } from '@nexura/common/word'
import { Reading, VideoPlay } from '@element-plus/icons-vue'
import { useAudio } from '@/hooks/useAudio'
const { playAudio } = useAudio({})
const isSmallScreen = ref(false)
const mediaQuery = window.matchMedia('(max-width: 767px)')
const updateScreenSize = () => {
    isSmallScreen.value = mediaQuery.matches
}
const total = ref<WordList['total']>(0)
const list = ref<WordList['list']>([])
const query = ref<WordQuery>({
    page: 1,
    pageSize: 12,
    word: '',
    gk: false,
    zk: false,
    gre: false,
    toefl: false,
    ielts: false,
    cet6: false,
    cet4: false,
    ky: false,
})
const searchWord = () => {
    query.value.page = 1 //重置一下页数
    getList() //重新获取列表
}

const getList = async () => {
    const res = await getWordBookList(query.value)
    if (res.success) {
        total.value = res.data.total
        list.value = res.data.list
    }
}


onMounted(() => {
    updateScreenSize()
    mediaQuery.addEventListener('change', updateScreenSize)
    getList()
})

onUnmounted(() => {
    mediaQuery.removeEventListener('change', updateScreenSize)
})
</script>
