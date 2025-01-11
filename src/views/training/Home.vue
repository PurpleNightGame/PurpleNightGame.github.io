<template>
  <div class="training-home">
    <!-- 欢迎信息 -->
    <div class="welcome-section">
      <n-gradient-text :size="24" type="primary">
        欢迎回来，{{ username }}
      </n-gradient-text>
      <div class="welcome-date">{{ currentDate }}</div>
    </div>

    <!-- 统计卡片 -->
    <n-grid :x-gap="24" :y-gap="24" cols="2 s:2 m:2 l:4" responsive="screen">
      <!-- 学员统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple">
              <n-icon size="32">
                <PeopleOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">学员总数</div>
              <div class="stat-value">{{ trainingMembersCount }}</div>
              <div class="stat-extra">
                <n-tag size="small" type="success">毕业学员: {{ graduatedMembersCount }}</n-tag>
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <!-- 请假统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue">
              <n-icon size="32">
                <CalendarOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">请假总数</div>
              <div class="stat-value">{{ onLeaveCount }}</div>
              <div class="stat-extra">
                <n-tag size="small" type="info">待销假: {{ waitingEndLeaveCount }}</n-tag>
                <n-tag size="small" type="warning">请假中: {{ onLeaveCount - waitingEndLeaveCount }}</n-tag>
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
      
      <!-- 违规统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon orange">
              <n-icon size="32">
                <AlertCircleOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">黑点总数</div>
              <div class="stat-value">{{ blacklistMembersCount }}</div>
              <div class="stat-extra">
                <n-tag size="small" type="error">违规成员: {{ monthlyBlacklistCount }}</n-tag>
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>

      <!-- 退队统计卡片 -->
      <n-grid-item>
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon red">
              <n-icon size="32">
                <LogOutOutline />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">退队总数</div>
              <div class="stat-value">{{ quitMembersCount }}</div>
              <div class="stat-extra">
                <n-tag size="small" type="error">未训: {{ untrainedQuitCount }}</n-tag>
                <n-tag size="small" type="warning">超时: {{ timeoutQuitCount }}</n-tag>
                <n-tag size="small" type="error">违规: {{ blacklistQuitCount }}</n-tag>
              </div>
            </div>
          </div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 图表区域 -->
    <n-grid :x-gap="24" :y-gap="24" cols="2" style="margin-top: 24px">
      <!-- 成员阶段分布图 -->
      <n-grid-item>
        <n-card title="成员阶段分布" class="chart-card">
          <template #header-extra>
            <n-space>
              <n-tag type="success">总计: {{ trainingMembersCount }}</n-tag>
            </n-space>
          </template>
          <div ref="stageChartRef" style="width: 100%; height: 300px"></div>
        </n-card>
      </n-grid-item>

      <!-- 成员状态分布图 -->
      <n-grid-item>
        <n-card title="成员状态分布" class="chart-card">
          <template #header-extra>
            <n-space>
              <n-tag :type="getStatusTagType(status)" v-for="status in ['正常', '催促新训', '催促参训', '未训退队', '超时退队', '违规退队']" :key="status">
                {{ status }}
              </n-tag>
            </n-space>
          </template>
          <div ref="statusChartRef" style="width: 100%; height: 300px"></div>
        </n-card>
      </n-grid-item>
    </n-grid>

    <!-- 最近活动和快速操作 -->
    <n-grid :x-gap="24" :y-gap="24" cols="3" style="margin-top: 24px">
      <!-- 最近活动 -->
      <n-grid-item span="2">
        <n-card title="最近活动" class="activity-card">
          <n-scrollbar style="max-height: 400px">
            <n-timeline>
              <n-timeline-item
                v-for="activity in recentActivities"
                :key="activity.id"
                :type="activity.type"
                :title="activity.title"
                :time="activity.time"
              >
                <template #header>
                  <n-space align="center">
                    <span class="activity-title">{{ activity.title }}</span>
                    <n-tag :type="activity.type" size="small" round>
                      {{ activity.category }}
                    </n-tag>
                  </n-space>
                </template>
                {{ activity.content }}
              </n-timeline-item>
            </n-timeline>
          </n-scrollbar>
        </n-card>
      </n-grid-item>

      <!-- 快速操作 -->
      <n-grid-item>
        <n-card title="快速操作" class="quick-actions-card">
          <n-space vertical>
            <n-button
              v-for="action in quickActions"
              :key="action.key"
              :type="action.type"
              block
              @click="action.handler"
            >
              <template #icon>
                <n-icon>
                  <component :is="action.icon" />
                </n-icon>
              </template>
              {{ action.label }}
            </n-button>
          </n-space>
        </n-card>

        <!-- 待办事项 -->
        <n-card title="待办事项" class="todo-card" style="margin-top: 24px">
          <n-list>
            <n-list-item v-for="todo in todoItems" :key="todo.key">
              <n-space align="center">
                <n-tag :type="todo.type" round>{{ todo.count }}</n-tag>
                <span>{{ todo.label }}</span>
              </n-space>
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  NCard, NGrid, NGridItem, NIcon, NTimeline, NTimelineItem, NGradientText,
  NSpace, NTag, NButton, NList, NListItem, NScrollbar, useMessage
} from 'naive-ui'
import { 
  PeopleOutline, CalendarOutline, AlertCircleOutline, LogOutOutline,
  TrendingUp, TrendingDown, AddCircleOutline, PersonAddOutline,
  DocumentTextOutline, TimeOutline
} from '@vicons/ionicons5'
import { MemberService, LeaveService, BlacklistService, QuitService, AssessmentService } from '../../utils/leancloud-service'
import * as echarts from 'echarts'
import AV from 'leancloud-storage'
import { authService } from '../../services/auth-service'

const router = useRouter()

// 当前用户名
const username = computed(() => {
  const user = authService.getCurrentUser()
  if (!user) {
    // 如果未登录，重定向到登录页面
    router.replace('/login')
    return ''
  }
  return user.username
})

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  })
})

// 定义响应式数据
const trainingMembersCount = ref(0)
const onLeaveCount = ref(0)
const waitingEndLeaveCount = ref(0)
const blacklistMembersCount = ref(0)
const monthlyBlacklistCount = ref(0)
const quitMembersCount = ref(0)
const untrainedQuitCount = ref(0)
const timeoutQuitCount = ref(0)
const blacklistQuitCount = ref(0)
const membersTrend = ref(0)
const graduatedMembersCount = ref(0)

// 快速操作
const quickActions = [
  {
    key: 'addMember',
    label: '添加成员',
    icon: PersonAddOutline,
    type: 'primary',
    handler: () => router.push('/training/member/list')
  },
  {
    key: 'addLeave',
    label: '登记请假',
    icon: CalendarOutline,
    type: 'info',
    handler: () => router.push('/training/leave-records')
  },
  {
    key: 'addBlacklist',
    label: '记录违规',
    icon: DocumentTextOutline,
    type: 'warning',
    handler: () => router.push('/training/blacklist/records')
  },
  {
    key: 'checkSchedule',
    label: '查看日程',
    icon: TimeOutline,
    type: 'success',
    handler: () => router.push('/training/schedule')
  }
]

// 待办事项
const todoItems = computed(() => [
  {
    key: 'waitingEndLeave',
    label: '待销假申请',
    count: waitingEndLeaveCount.value,
    type: 'info'
  },
  {
    key: 'warningMembers',
    label: '催促参训成员',
    count: warningMembersCount.value,
    type: 'warning'
  },
  {
    key: 'blacklistMembers',
    label: '违规待处理',
    count: pendingBlacklistCount.value,
    type: 'error'
  }
])

// 图表引用
const stageChartRef = ref<HTMLElement | null>(null)
const statusChartRef = ref<HTMLElement | null>(null)
let stageChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null

// 最近活动
const recentActivities = ref([])

// 其他计算属性
const warningMembersCount = ref(0)
const pendingBlacklistCount = ref(0)

// 生成最近活动
const generateRecentActivities = async () => {
  const activities: any[] = []

  try {
    // 获取最新的记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    const quitRecords = await QuitService.getAllQuitRecords()

    // 获取所有成员信息，用于补充缺失的memberName
    const members = await MemberService.getAllMembers()
    const memberMap = new Map(members.map(member => [member.objectId, member]))

    // 添加请假记录
    leaveRecords.forEach(record => {
      const member = memberMap.get(record.memberId)
      if (member) {
        activities.push({
          id: record.objectId,
          type: 'info',
          category: '请假',
          title: `${member.nickname} 请假`,
          time: new Date(record.startDate).toLocaleDateString(),
          content: `请假时间：${record.startDate} 至 ${record.endDate}`,
          rawTime: record.startDate // 用于排序的原始时间
        })
      }
    })

    // 添加违规记录
    blacklistRecords.forEach(record => {
      const member = memberMap.get(record.memberId)
      if (member) {
        activities.push({
          id: record.objectId,
          type: 'warning',
          category: '违规',
          title: `${member.nickname} 收到黑点`,
          time: new Date(record.date).toLocaleDateString(),
          content: `原因：${record.reason}`,
          rawTime: record.date // 用于排序的原始时间
        })
      }
    })

    // 添加退队记录
    quitRecords.forEach(record => {
      const memberName = record.memberName || (memberMap.get(record.memberId)?.nickname)
      if (memberName) {
        activities.push({
          id: record.objectId,
          type: 'error',
          category: '退队',
          title: `${memberName} 退队`,
          time: new Date(record.quitDate).toLocaleDateString(),
          content: `退队类型：${record.quitType}`,
          rawTime: record.quitDate // 用于排序的原始时间
        })
      }
    })

    // 按原始时间排序（最新的在前）
    activities.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())
    
    // 只保留最近的10条记录
    recentActivities.value = activities.slice(0, 10)

    console.log('Recent activities:', recentActivities.value)
  } catch (error) {
    console.error('Failed to generate recent activities:', error)
  }
}

// 修改 loadStats 函数
const loadStats = async () => {
  try {
    // 获取所有成员
    const members = await MemberService.getAllMembers()
    const trainingMembers = members.filter(member => 
      member.stage !== '紫夜' && 
      member.stage !== '未新训'
    )
    trainingMembersCount.value = trainingMembers.length

    // 统计有 passDate 的成员数量作为毕业成员数
    graduatedMembersCount.value = members.filter(member => member.passDate).length

    // 获取请假记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    const activeLeaveRecords = leaveRecords.filter(record => 
      record.status === '请假中' || record.status === '等待销假'
    )
    onLeaveCount.value = activeLeaveRecords.length
    waitingEndLeaveCount.value = activeLeaveRecords.filter(record => 
      record.status === '等待销假'
    ).length

    // 获取黑点记录
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    // 获取黑点消除记录
    const blacklistRemoveRecords = await BlacklistService.getAllBlacklistRemoveRecords()
    
    // 计算所有黑点总数
    blacklistMembersCount.value = blacklistRecords.length

    // 计算当前违规成员数量（有黑点但没有对应消除记录的成员）
    const memberBlacklistMap = new Map() // 用于统计每个成员的黑点和消除记录
    
    // 记录所有黑点
    blacklistRecords.forEach(record => {
      const memberId = record.memberId
      if (!memberBlacklistMap.has(memberId)) {
        memberBlacklistMap.set(memberId, { blacklist: 0, removed: 0 })
      }
      memberBlacklistMap.get(memberId).blacklist++
    })
    
    // 记录所有消除记录
    blacklistRemoveRecords.forEach(record => {
      const memberId = record.memberId
      if (memberBlacklistMap.has(memberId)) {
        memberBlacklistMap.get(memberId).removed++
      }
    })
    
    // 计算仍有未消除黑点的成员数量
    monthlyBlacklistCount.value = Array.from(memberBlacklistMap.values())
      .filter(stats => stats.blacklist > stats.removed)
      .length

    // 获取退队记录
    const quitRecords = await QuitService.getAllQuitRecords()
    quitMembersCount.value = quitRecords.length
    
    // 统计不同类型的退队
    untrainedQuitCount.value = quitRecords.filter(record => 
      record.quitType === '未训退队'
    ).length
    timeoutQuitCount.value = quitRecords.filter(record => 
      record.quitType === '超时退队'
    ).length
    blacklistQuitCount.value = quitRecords.filter(record => 
      record.quitType === '违规退队'
    ).length

    // 统计催促参训成员
    warningMembersCount.value = members.filter(member => 
      member.status === '催促参训'
    ).length

    // 统计待处理违规
    pendingBlacklistCount.value = blacklistRecords.filter(record => 
      record.status === '未消除'
    ).length

    // 更新图表数据
    updateCharts(members)

    // 生成最近活动（直接调用，不再传递参数）
    await generateRecentActivities()

    // 计算成员趋势
    membersTrend.value = calculateMembersTrend(members)
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

// 计算成员趋势
const calculateMembersTrend = (members: any[]) => {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  
  // 获取本月的成员数（不包括紫夜和未新训）
  const currentMonthMembers = members.filter(member => {
    const joinDate = new Date(member.joinTime)
    return member.stage !== '紫夜' && 
           member.stage !== '未新训' &&
           joinDate.getMonth() <= thisMonth &&
           joinDate.getFullYear() <= thisYear
  }).length

  // 获取上月的成员数
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear
  const lastMonthMembers = members.filter(member => {
    const joinDate = new Date(member.joinTime)
    return member.stage !== '紫夜' && 
           member.stage !== '未新训' &&
           ((joinDate.getFullYear() < lastYear) ||
            (joinDate.getFullYear() === lastYear && joinDate.getMonth() <= lastMonth))
  }).length

  // 计算变化百分比
  if (lastMonthMembers === 0) {
    return currentMonthMembers > 0 ? 100 : 0
  }
  
  const trend = ((currentMonthMembers - lastMonthMembers) / lastMonthMembers) * 100
  return Math.round(trend) // 四舍五入到整数
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: { [key: string]: string } = {
    '正常': 'success',
    '催促新训': 'warning',
    '催促参训': 'warning',
    '未训退队': 'error',
    '超时退队': 'error',
    '违规退队': 'error'
  }
  return typeMap[status] || 'default'
}

// 更新图表
const updateCharts = async (members: any[]) => {
  // 更新成员阶段分布图
  if (stageChart && !stageChart.isDisposed()) {
    const stageData = calculateStageDistribution(members)
    stageChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '20',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: stageData
        }
      ]
    })
  }

  // 更新成员状态分布图
  if (statusChart && !statusChart.isDisposed()) {
    const statusData = await calculateStatusDistribution(members)
    statusChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: statusData.map(item => item.name),
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series: [
        {
          name: '人数',
          type: 'bar',
          barWidth: '60%',
          data: statusData.map(item => ({
            value: item.value,
            itemStyle: {
              color: getStatusColor(item.name)
            }
          }))
        }
      ]
    })
  }
}

// 计算成员阶段分布
const calculateStageDistribution = (members: any[]) => {
  const stages = ['未新训', '新训初期', '新训1期', '新训2期', '新训3期', '新训准考', '紫夜']
  const distribution = new Map()
  
  stages.forEach(stage => distribution.set(stage, 0))
  members.forEach(member => {
    const count = distribution.get(member.stage) || 0
    distribution.set(member.stage, count + 1)
  })

  return Array.from(distribution.entries()).map(([name, value]) => ({
    name,
    value
  }))
}

// 计算成员状态分布
const calculateStatusDistribution = async (members: any[]) => {
  const statuses = ['正常', '催促新训', '催促参训', '未训退队', '超时退队', '违规退队']
  const distribution = new Map()
  
  statuses.forEach(status => distribution.set(status, 0))

  try {
    // 获取所有退队记录
    const quitRecords = await QuitService.getAllQuitRecords()
    const quitMemberIds = new Set(quitRecords.map(record => record.memberId))
    
    // 获取请假记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    const activeLeaveMembers = new Set(
      leaveRecords
        .filter(record => record.status === '请假中' || record.status === '等待销假')
        .map(record => record.memberId)
    )

    // 先统计退队记录
    quitRecords.forEach(record => {
      const count = distribution.get(record.quitType) || 0
      distribution.set(record.quitType, count + 1)
    })

    // 过滤掉已退队的成员
    const activeMembers = members.filter(member => !quitMemberIds.has(member.objectId))

    // 统计活跃成员的状态
    activeMembers.forEach(member => {
      // 如果成员已通过考核或是紫夜，状态为正常
      if (member.passDate || member.stage === '紫夜') {
        const count = distribution.get('正常') || 0
        distribution.set('正常', count + 1)
        return
      }

      // 如果成员在请假中，计入正常状态
      if (activeLeaveMembers.has(member.objectId)) {
        const count = distribution.get('正常') || 0
        distribution.set('正常', count + 1)
        return
      }

      // 检查是否为未新训成员
      if (member.stage === '未新训') {
        const joinDate = new Date(member.joinTime)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays < 3) {
          // 3天内的未新训成员为催促新训
          const count = distribution.get('催促新训') || 0
          distribution.set('催促新训', count + 1)
        }
        return
      }

      // 检查最后训练时间
      if (member.lastTrainingDate) {
        const lastDate = new Date(member.lastTrainingDate)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays >= 7) {
          // 超过7天未训练为催促参训
          const count = distribution.get('催促参训') || 0
          distribution.set('催促参训', count + 1)
        } else {
          // 正常训练状态
          const count = distribution.get('正常') || 0
          distribution.set('正常', count + 1)
        }
        return
      }

      // 其他情况默认为正常（已经开始训练的成员）
      const count = distribution.get('正常') || 0
      distribution.set('正常', count + 1)
    })

    return Array.from(distribution.entries()).map(([name, value]) => ({
      name,
      value
    }))
  } catch (error) {
    console.error('Failed to calculate status distribution:', error)
    return []
  }
}

// 获取状态对应的颜色
const getStatusColor = (status: string) => {
  const colorMap: { [key: string]: string } = {
    '正常': '#18a058',
    '催促新训': '#f0a020',
    '催促参训': '#f0a020',
    '未训退队': '#d03050',
    '超时退队': '#d03050',
    '违规退队': '#d03050'
  }
  return colorMap[status] || '#909399'
}

// 自动更新定时器
let updateTimer: number | null = null

// 启动自动更新（增加更新频率）
const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    try {
      await loadStats()
    } catch (error) {
      console.error('Auto update failed:', error)
      message.error('数据更新失败')
    }
  }, 30000) // 每30秒更新一次
}

// 组件挂载时初始化图表并加载数据
let handleResize: (() => void) | null = null

onMounted(async () => {
  try {
    // 初始化图表
    if (stageChartRef.value) {
      stageChart = echarts.init(stageChartRef.value)
    }
    if (statusChartRef.value) {
      statusChart = echarts.init(statusChartRef.value)
    }

    // 加载数据
    await loadStats()
    
    // 启动自动更新
    startAutoUpdate()

    // 监听窗口大小变化
    handleResize = () => {
      if (stageChart && !stageChart.isDisposed()) {
        stageChart.resize()
      }
      if (statusChart && !statusChart.isDisposed()) {
        statusChart.resize()
      }
    }
    window.addEventListener('resize', handleResize)
  } catch (error) {
    console.error('Failed to initialize charts:', error)
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  if (stageChart && !stageChart.isDisposed()) {
    stageChart.dispose()
  }
  if (statusChart && !statusChart.isDisposed()) {
    statusChart.dispose()
  }
  if (handleResize) {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<style scoped>
.training-home {
  padding: 24px;
}

.welcome-section {
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #EDE7F6 0%, #fff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.welcome-date {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.stat-card {
  background: #fff;
  border: 1px solid rgba(123, 31, 162, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 20px rgba(123, 31, 162, 0.15);
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  margin-right: 16px;
  padding: 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.purple {
    background: rgba(123, 31, 162, 0.1);
    color: #7B1FA2;
  }

  &.blue {
    background: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }

  &.orange {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }

  &.red {
    background: rgba(245, 34, 45, 0.1);
    color: #f5222d;
  }
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;

  &.up {
    color: #18a058;
  }

  &.down {
    color: #d03050;
  }
}

.stat-extra {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.chart-card {
  height: 360px;
  background: #fff;
  border: 1px solid rgba(123, 31, 162, 0.1);
}

.activity-card {
  height: 100%;
  background: #fff;
  border: 1px solid rgba(123, 31, 162, 0.1);
}

.quick-actions-card, .todo-card {
  background: #fff;
  border: 1px solid rgba(123, 31, 162, 0.1);
}

.activity-title {
  font-weight: 500;
  color: #333;
}

:deep(.n-timeline-item) {
  margin-bottom: 16px;
}

:deep(.n-card-header) {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

:deep(.n-button) {
  font-weight: 500;
}

:deep(.n-list-item) {
  padding: 8px 0;
}
</style> 