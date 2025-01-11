<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">未训退队</n-h2>
    </template>

    <n-space vertical>
      <n-space>
        <n-input
          v-model:value="searchText"
          placeholder="搜索昵称/QQ号"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <n-icon><search-outline /></n-icon>
          </template>
        </n-input>
        <n-select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          clearable
          :options="[
            { label: '催促参训', value: '催促参训' },
            { label: '未训退队', value: '未训退队' }
          ]"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="joinDateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="加入时间范围"
          style="width: 250px"
        />
        <n-input-number
          v-model:value="minDaysLeft"
          placeholder="最小剩余天数"
          clearable
          :min="0"
          style="width: 120px"
        />
        <n-input-number
          v-model:value="maxDaysLeft"
          placeholder="最大剩余天数"
          clearable
          :min="0"
          style="width: 120px"
        />
      </n-space>

      <n-data-table
        :columns="columns"
        :data="filteredData"
        :pagination="pagination"
        :loading="loading"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  NButton, 
  NSpace, 
  NTag, 
  NPopconfirm, 
  useMessage,
  NInput,
  NSelect,
  NDatePicker,
  NInputNumber,
  NIcon,
  zhCN
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { MemberService, QuitService, LeaveService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 定义 Member 接口
interface Member {
  objectId: string
  nickname: string
  qq: string
  gameId?: string
  joinTime: string
  stage: string
  leaveRequest?: string
}

// 扩展 Member 类型
interface UntrainedMember extends Member {
  daysLeft: number
  status: '催促参训' | '未训退队'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<UntrainedMember[]> => {
  try {
    loading.value = true
    const [members, leaveRecords, quitRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords(),
      QuitService.getAllQuitRecords()
    ])
    
    // 创建退队记录映射
    const quitMemberIds = new Set(quitRecords.map(record => record.memberId))
    
    // 过滤出非请假状态的未新训成员
    const untrainedMembers = members
      .filter((member: Member) => {
        // 检查是否处于请假状态（包括请假中和等待销假）
        const isOnLeave = leaveRecords.some(record => 
          record.memberId === member.objectId && 
          (record.status === '请假中' || record.status === '等待销假')
        )
        
        // 如果在请假中或留队申请已通过，不显示在未新训名单中
        if (isOnLeave || member.leaveRequest === '通过') {
          return false
        }

        // 只处理未新训的成员
        return member.stage === '未新训'
      })

    // 处理每个成员的状态
    const processedMembers = await Promise.all(untrainedMembers.map(async (member: Member) => {
      const joinDate = new Date(member.joinTime)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 3 - diffDays)
      const status = daysLeft > 0 ? '催促参训' : '未训退队'

      // 如果状态是未训退队且没有退队记录，添加退队记录
      if (status === '未训退队' && !quitMemberIds.has(member.objectId)) {
        try {
          await QuitService.addQuitRecord({
            memberId: member.objectId,
            memberName: member.nickname,
            memberQQ: member.qq,
            quitDate: new Date().toISOString().split('T')[0],
            quitType: '未训退队',
            reason: '加入3天内未参加新训',
            recorder: 'System'
          })
        } catch (error) {
          console.error('添加退队记录失败:', error)
        }
      }

      return {
        ...member,
        daysLeft,
        status
      }
    }))

    return processedMembers
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 表格数据
const tableData = ref<UntrainedMember[]>([])

// 搜索和筛选状态
const searchText = ref('')
const statusFilter = ref(null)
const joinDateRange = ref(null)
const minDaysLeft = ref<number | null>(null)
const maxDaysLeft = ref<number | null>(null)

// 修改表格数据的计算属性
const filteredData = computed(() => {
  let result = tableData.value

  // 搜索文本过滤
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    result = result.filter(member => 
      member.nickname.toLowerCase().includes(searchLower) ||
      member.qq.toLowerCase().includes(searchLower)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(member => member.status === statusFilter.value)
  }

  // 加入时间范围过滤
  if (joinDateRange.value && joinDateRange.value[0] && joinDateRange.value[1]) {
    const startTime = new Date(joinDateRange.value[0]).getTime()
    const endTime = new Date(joinDateRange.value[1]).getTime()
    result = result.filter(member => {
      const joinTime = new Date(member.joinTime).getTime()
      return joinTime >= startTime && joinTime <= endTime
    })
  }

  // 剩余天数范围过滤
  if (minDaysLeft.value !== null) {
    result = result.filter(member => member.daysLeft >= minDaysLeft.value!)
  }
  if (maxDaysLeft.value !== null) {
    result = result.filter(member => member.daysLeft <= maxDaysLeft.value!)
  }

  return result
})

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('untrainedPageSize')) || 10,
  itemCount: computed(() => filteredData.value.length),
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`
})

// 表格列配置
const columns = [
  {
    title: '昵称',
    key: 'nickname',
    width: 130,
    sorter: 'default'
  },
  {
    title: 'QQ号',
    key: 'qq',
    width: 130,
    sorter: (row1: UntrainedMember, row2: UntrainedMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '加入时间',
    key: 'joinTime',
    width: 130,
    sorter: (row1: UntrainedMember, row2: UntrainedMember) => 
      new Date(row1.joinTime).getTime() - new Date(row2.joinTime).getTime()
  },
  {
    title: '剩余天数',
    key: 'daysLeft',
    width: 100,
    sorter: (row1: UntrainedMember, row2: UntrainedMember) => row1.daysLeft - row2.daysLeft
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: UntrainedMember) => h(
      NTag,
      {
        type: row.status === '催促参训' ? 'warning' : 'error',
        round: true
      },
      { default: () => row.status }
    )
  }
]

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  localStorage.setItem('untrainedPageSize', pageSize.toString())
}

// 自动刷新定时器
let refreshTimer: number | null = null

// 组件挂载时加载数据
onMounted(async () => {
  tableData.value = await loadFromStorage()
  // 设置自动刷新（每5分钟）
  refreshTimer = window.setInterval(async () => {
    tableData.value = await loadFromStorage()
  }, 300000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}

:deep(.n-tag--warning) {
  background-color: #fff7e6;
  color: #f0a020;
  border: 1px solid #f0a020;
}

:deep(.n-tag--error) {
  background-color: #ffebee;
  color: #d03050;
  border: 1px solid #d03050;
}
</style> 