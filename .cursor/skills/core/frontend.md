---
triggers:
  - 新增页面
  - 新增路由
  - API 封装
  - Store
  - 前端开发
  - View
  - 列表页
  - 搜索
  - 分页
  - 表格
  - 弹窗
---

# 前端开发流程

详细的前端开发步骤，包含 API 封装、Router 配置、View 页面、Store 的完整规范。

---

## Step 1: API 封装

**位置**: `apps/web/src/apis/{module}/index.ts`

### 导入规则

```typescript
import { serverApi, type Response } from '..';
import type { CreateXxxDto, XxxQuery, XxxList, Xxx } from '@nexura/common/xxx';
```

### GET 接口（查询列表）

```typescript
export const getXxxList = (params: XxxQuery): Promise<Response<XxxList>> => {
    return serverApi.get('/xxx', { params }) as Promise<Response<XxxList>>;
};
```

### POST 接口（写操作）

```typescript
export const createXxx = (data: CreateXxxDto): Promise<Response<Xxx>> => {
    return serverApi.post('/xxx/create', data) as Promise<Response<Xxx>>;
};

export const updateXxx = (data: UpdateXxxDto): Promise<Response<Xxx>> => {
    return serverApi.post('/xxx/update', data) as Promise<Response<Xxx>>;
};

export const deleteXxx = (id: string): Promise<Response<boolean>> => {
    return serverApi.post(`/xxx/delete/${id}`) as Promise<Response<boolean>>;
};
```

### 返回值类型

`Response<T>` 的结构：

```typescript
interface Response<T = any> {
    timestamp: string;
    path: string;
    message: string;
    code: number;
    success: boolean;
    data: T;
}
```

### 调用方式

```typescript
const res = await getXxxList(query.value);
if (res.success) {
    list.value = res.data.list;
    total.value = res.data.total;
}
```

---

## Step 2: Router 配置

**位置**: `apps/web/src/router/{module}/index.ts`

### 单页面

```typescript
import layout from '@/layout/index.vue';

export default [
    {
        path: '/xxx',
        component: layout,
        children: [
            { path: 'index', component: () => import('@/views/Xxx/index.vue') },
        ]
    }
];
```

### 多子页面

```typescript
import layout from '@/layout/index.vue';

export default [
    {
        path: '/xxx',
        component: layout,
        children: [
            { path: 'index', component: () => import('@/views/Xxx/index.vue') },
            { path: 'detail/:id', component: () => import('@/views/Xxx/Detail.vue') },
            { path: 'create', component: () => import('@/views/Xxx/Create.vue') },
        ]
    }
];
```

### 注册到主路由

**位置**: `apps/web/src/router/index.ts`

```typescript
import xxx from './xxx/index';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...home,
    // ... 已有路由
    ...xxx,   // 新增
  ]
});
```

---

## Step 3: View 页面

**位置**: `apps/web/src/views/{Module}/index.vue`

### 基础结构

```vue
<template>
    <div class="w-[1200px] mx-auto mt-10">
        <!-- 页面内容 -->
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
</script>
```

### 列表页结构

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getXxxList } from '@/apis/xxx';
import type { XxxQuery, XxxList } from '@nexura/common/xxx';

const list = ref<XxxList['list']>([]);
const total = ref<XxxList['total']>(0);
const query = ref<XxxQuery>({
    page: 1,
    pageSize: 10,
});

const getList = async () => {
    const res = await getXxxList(query.value);
    if (res.success) {
        list.value = res.data.list;
        total.value = res.data.total;
    }
};

onMounted(() => getList());
</script>
```

### 搜索 + 分页

```vue
<template>
    <el-input v-model="query.name" placeholder="请输入名称" @keyup.enter="search" />
    <el-button type="primary" @click="search">搜索</el-button>

    <el-table :data="list">
        <el-table-column prop="name" label="名称" />
    </el-table>

    <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @current-change="getList"
        @size-change="getList"
    />
</template>

<script setup lang="ts">
const search = () => {
    query.value.page = 1;  // 搜索时必须重置页码
    getList();
};
</script>
```

### 增删改操作

```typescript
import { createXxx, updateXxx, deleteXxx } from '@/apis/xxx';
import { ElMessage, ElMessageBox } from 'element-plus';

const handleCreate = async (data: CreateXxxDto) => {
    const res = await createXxx(data);
    if (res.success) {
        ElMessage.success('创建成功');
        getList();
    }
};

const handleDelete = async (id: string) => {
    try {
        await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' });
        const res = await deleteXxx(id);
        if (res.success) {
            ElMessage.success('删除成功');
            getList();
        }
    } catch {}
};
```

### 样式约定

- 使用 Tailwind CSS 工具类
- 容器宽度：`w-[1200px] mx-auto`
- 卡片风格：`bg-white rounded-lg p-6 shadow`
- 渐变背景：`bg-linear-to-br from-blue-50 to-indigo-50`
- 圆角：`rounded-[10px]` 或 `rounded-[20px]`

---

## Step 4: Store（按需）

**位置**: `apps/web/src/stores/{module}.ts`

### 何时需要 Store

以下情况需要 Store：

- 数据需要跨多个页面/组件共享
- 数据需要跨路由导航保持
- 数据需要持久化（刷新后不丢失）

以下情况不需要 Store：

- 数据只在单个页面使用（直接用 `ref` 即可）
- 数据每次进入页面都需要重新获取

### Store 结构

```typescript
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { Xxx } from '@nexura/common/xxx';

export const useXxxStore = defineStore('xxx', () => {
  // State
  const data = ref<Xxx | null>(null);

  // Actions
  const setData = (val: Xxx) => { data.value = val; };
  const clear = () => { data.value = null; };

  // Getters
  const getData = computed(() => data.value);

  return { data, setData, clear, getData };
}, { persist: true });  // 需要持久化时加这个
```

### 在组件中使用

```typescript
import { useXxxStore } from '@/stores/xxx';

const xxxStore = useXxxStore();

// 读取
const data = xxxStore.getData;

// 修改
xxxStore.setData(newData);

// 清空
xxxStore.clear();
```

---

## 常用 Element Plus 组件

### 表格

```vue
<el-table :data="list" border>
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="createdAt" label="创建时间" />
    <el-table-column label="操作" width="180">
        <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
    </el-table-column>
</el-table>
```

### 表单

```vue
<el-form :model="form" label-width="80px">
    <el-form-item label="名称">
        <el-input v-model="form.name" />
    </el-form-item>
    <el-form-item>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
    </el-form-item>
</el-form>
```

### 弹窗

```vue
<el-dialog v-model="dialogVisible" title="新增">
    <!-- 表单内容 -->
    <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
</el-dialog>
```

### 标签

```vue
<el-tag v-if="item.isActive" type="primary" size="small">启用</el-tag>
<el-tag v-else type="info" size="small">禁用</el-tag>
```

---

## 常见反模式

### 不要在 View 中直接调用 serverApi

```typescript
// 错误
import { serverApi } from '@/apis';
const res = await serverApi.get('/xxx');

// 正确
import { getXxxList } from '@/apis/xxx';
const res = await getXxxList(query.value);
```

### 不要忘记重置分页

```typescript
// 错误：搜索后不重置页码，可能导致空数据
const search = () => {
    getList();
};

// 正确
const search = () => {
    query.value.page = 1;
    getList();
};
```

### 不要遗漏 import type

```typescript
// 错误
import { XxxList } from '@nexura/common/xxx';

// 正确
import type { XxxList } from '@nexura/common/xxx';
```


---

## 完整代码模板

### 前端 API 模板

**位置**: `apps/web/src/apis/{module}/index.ts`

```typescript
import { serverApi, type Response } from '..';
import type { CreateXxxDto, UpdateXxxDto, XxxQuery, XxxList, Xxx } from '@nexura/common/xxx';

export const getXxxList = (params: XxxQuery): Promise<Response<XxxList>> => {
    return serverApi.get('/xxx', { params }) as Promise<Response<XxxList>>;
};

export const createXxx = (data: CreateXxxDto): Promise<Response<Xxx>> => {
    return serverApi.post('/xxx/create', data) as Promise<Response<Xxx>>;
};

export const updateXxx = (data: UpdateXxxDto): Promise<Response<Xxx>> => {
    return serverApi.post('/xxx/update', data) as Promise<Response<Xxx>>;
};

export const deleteXxx = (id: string): Promise<Response<boolean>> => {
    return serverApi.post(`/xxx/delete/${id}`) as Promise<Response<boolean>>;
};
```

---

### 前端 Router 模板

**位置**: `apps/web/src/router/{module}/index.ts`

```typescript
import layout from '@/layout/index.vue';

export default [
    {
        path: '/xxx',
        component: layout,
        children: [
            { path: 'index', component: () => import('@/views/Xxx/index.vue') },
        ]
    }
];
```

---

### 前端 View 模板（列表页）

**位置**: `apps/web/src/views/{Module}/index.vue`

```vue
<template>
    <div class="w-[1200px] mx-auto mt-10 bg-white rounded-lg p-6 shadow">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold">Xxx 管理</h2>
            <el-button type="primary" @click="handleCreate">新增</el-button>
        </div>

        <div class="flex items-center mb-4">
            <el-input v-model="query.name" placeholder="请输入名称" class="mr-4" @keyup.enter="search" />
            <el-button type="primary" @click="search">搜索</el-button>
        </div>

        <el-table :data="list" border>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="createdAt" label="创建时间" />
            <el-table-column label="操作" width="180">
                <template #default="{ row }">
                    <el-button size="small" @click="handleEdit(row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination
            class="mt-4"
            background
            v-model:current-page="query.page"
            v-model:page-size="query.pageSize"
            :total="total"
            @current-change="getList"
            @size-change="getList"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getXxxList, deleteXxx } from '@/apis/xxx';
import type { XxxQuery, XxxList } from '@nexura/common/xxx';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<XxxList['list']>([]);
const total = ref<XxxList['total']>(0);
const query = ref<XxxQuery>({ page: 1, pageSize: 10 });

const getList = async () => {
    const res = await getXxxList(query.value);
    if (res.success) {
        list.value = res.data.list;
        total.value = res.data.total;
    }
};

const search = () => {
    query.value.page = 1;
    getList();
};

const handleCreate = () => {};
const handleEdit = (row: any) => {};

const handleDelete = async (id: string) => {
    try {
        await ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' });
        const res = await deleteXxx(id);
        if (res.success) {
            ElMessage.success('删除成功');
            getList();
        }
    } catch {}
};

onMounted(() => getList());
</script>
```

---

### 前端 Store 模板

**位置**: `apps/web/src/stores/{module}.ts`

```typescript
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { Xxx } from '@nexura/common/xxx';

export const useXxxStore = defineStore('xxx', () => {
  const data = ref<Xxx | null>(null);

  const setData = (val: Xxx) => { data.value = val; };
  const getData = computed(() => data.value);
  const clear = () => { data.value = null; };

  return { data, setData, getData, clear };
}, { persist: true });
```
