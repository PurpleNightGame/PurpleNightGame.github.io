<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">成员列表</n-h2>
        <n-button type="primary" @click="handleAdd">
          添加成员
        </n-button>
      </n-space>
    </template>
    <!-- 后续添加成员表格等内容 -->
  </n-card>
</template>

<script setup lang="ts">
const handleAdd = () => {
  // 处理添加成员逻辑
}
</script>

<style scoped>
:deep(.n-button) {
  background-color: #7B1FA2;
}
</style> 