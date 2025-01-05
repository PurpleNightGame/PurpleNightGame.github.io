<template>
  <div class="training-home">
    <n-grid :x-gap="24" :y-gap="24" cols="2 s:2 m:2 l:4" responsive="screen">
      <!-- 学员统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <n-icon size="48" color="#7B1FA2">
                <PeopleOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">学员总数</div>
              <div class="stat-value">{{ trainingMembersCount }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <!-- 请假统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <n-icon size="48" color="#7B1FA2">
                <CalendarOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">请假总数</div>
              <div class="stat-value">{{ onLeaveCount }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <!-- 违规统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">
              <n-icon size="48" color="#7B1FA2">
                <AlertCircleOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">违规总数</div>
              <div class="stat-value">{{ blacklistMembersCount }}</div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <!-- 其他统计卡片... -->
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { NCard, NGrid, NGridItem, NIcon } from 'naive-ui'
import { PeopleOutline, CalendarOutline, AlertCircleOutline } from '@vicons/ionicons5'
import { MemberService, LeaveService, BlacklistService } from '../../utils/leancloud-service'

// 定义响应式数据
const trainingMembersCount = ref(0)
const onLeaveCount = ref(0)
const blacklistMembersCount = ref(0)

// 加载统计数据
const loadStats = async () => {
  try {
    // 获取所有成员
    const members = await MemberService.getAllMembers()
    // 只统计非紫夜和未新训状态的队员
    trainingMembersCount.value = members.filter(member => 
      member.stage !== '紫夜' && 
      member.stage !== '未新训'
    ).length

    // 获取请假记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    // 统计当前处于请假中和等待销假状态的记录
    onLeaveCount.value = leaveRecords.filter(record => 
      record.status === '请假中' || record.status === '等待销假'
    ).length

    // 获取黑点记录
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    // 获取所有有黑点记录的成员ID（去重）
    const memberIds = new Set(blacklistRecords.map(record => record.memberId))
    blacklistMembersCount.value = memberIds.size
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

// 自动更新定时器
let updateTimer: number | null = null

// 启动自动更新
const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    await loadStats()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时加载数据并启动定时更新
onMounted(async () => {
  await loadStats()
  startAutoUpdate()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})
</script>

<style scoped>
.training-home {
  padding: 24px;
}

.stat-card {
  height: 120px;
  background: linear-gradient(135deg, #EDE7F6 0%, #fff 100%);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 16px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-title {
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #7B1FA2;
}
</style> 