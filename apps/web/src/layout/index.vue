<template>
    <Header />
    <main class="pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Content />
    </main>
</template>
<script setup lang="ts">
import Header from './Header/index.vue'
import Content from './Content/index.vue'
</script>