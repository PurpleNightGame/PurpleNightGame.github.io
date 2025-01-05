<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">课程列表</n-h2>
        <n-button type="primary" @click="handleAdd">
          添加课程
        </n-button>
      </n-space>
    </template>
    <!-- 后续添加课程表格等内容 -->
  </n-card>
</template>

<script setup lang="ts">
const handleAdd = () => {
  // 处理添加课程逻辑
}
</script>

<style scoped>
:deep(.n-button) {
  background-color: #7B1FA2;
}
</style> 