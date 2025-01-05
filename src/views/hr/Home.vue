<template>
  <n-card>
    <n-space vertical :size="24">
      <n-h1 style="color: #7B1FA2">人事管理系统</n-h1>
      <n-grid :x-gap="24" :y-gap="24" cols="2">
        <n-grid-item>
          <n-card title="公会成员" class="stat-card">
            <n-statistic label="总成员数" :value="128">
              <template #prefix>
                <n-icon>
                  <PeopleOutline />
                </n-icon>
              </template>
            </n-statistic>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card title="今日在线" class="stat-card">
            <n-statistic label="在线成员" :value="56">
              <template #prefix>
                <n-icon>
                  <PersonOutline />
                </n-icon>
              </template>
            </n-statistic>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { PeopleOutline, PersonOutline } from '@vicons/ionicons5'
</script>

<style scoped>
.stat-card :deep(.n-card-header) {
  color: #7B1FA2;
}

.stat-card :deep(.n-statistic-label) {
  color: #666;
}

.stat-card :deep(.n-statistic-value) {
  color: #7B1FA2;
  font-size: 24px;
}
</style> 