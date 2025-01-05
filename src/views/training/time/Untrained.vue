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

// 扩展 Member 类型
interface UntrainedMember extends Member {
  objectId?: string
  daysLeft: number
  status: '催促参训' | '未训退队'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<UntrainedMember[]> => {
  try {
    loading.value = true
    const [members, leaveRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords()
    ])
    
    // 过滤出非请假状态的未新训成员
    return members
      .filter((member: any) => {
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
      .map((member: any) => {
        const joinDate = new Date(member.joinTime)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
        const daysLeft = Math.max(0, 3 - diffDays)
        const status = daysLeft > 0 ? '催促新训' : '未训退队'

        // 如果状态是未训退队，自动添加到退队记录
        if (status === '未训退队' && !member.hasQuitRecord) {
          handleAutoQuit(member)
        }

        return {
          id: member.objectId,
          nickname: member.nickname,
          qq: member.qq,
          gameId: member.gameId || '',
          joinTime: member.joinTime,
          stage: member.stage,
          daysLeft,
          status
        }
      })
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 自动处理未训退队
const handleAutoQuit = async (member: any) => {
  try {
    // 验证必要的成员信息是否存在
    if (!member || !member.objectId) {
      console.error('无效的成员数据:', member)
      return
    }

    // 检查是否已经有退队记录
    const quitRecords = await QuitService.getAllQuitRecords()
    const hasQuitRecord = quitRecords.some(record => 
      record.memberId === member.objectId && record.quitType === '未训退队'
    )
    
    if (!hasQuitRecord) {
      const quitData = {
        memberId: member.objectId,
        memberName: member.nickname,
        memberQQ: member.qq,
        quitDate: new Date().toISOString().split('T')[0],
        quitType: '未训退队',
        reason: '加入3天内未参加新训',
        recorder: 'System'
      }

      // 验证所有必要字段
      const requiredFields = ['memberId', 'memberName', 'memberQQ', 'quitDate', 'quitType', 'reason', 'recorder']
      const missingFields = requiredFields.filter(field => !quitData[field])
      
      if (missingFields.length > 0) {
        console.error('缺少必要字段:', missingFields)
        return
      }

      // 创建退队记录
      await QuitService.addQuitRecord(quitData)
      
      // 更新成员状态
      await MemberService.updateMember(member.objectId, {
        status: '未训退队'
      })

      console.log('已自动创建未训退队记录:', member.nickname)
    }
  } catch (e) {
    console.error('Failed to handle auto quit:', e)
    if (member) {
      console.error('成员信息:', {
        id: member.objectId,
        nickname: member.nickname,
        qq: member.qq
      })
    }
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
    sorter: (row1: UntrainedMember, row2: UntrainedMember) => row1.daysLeft - row2.daysLeft,
    render(row: UntrainedMember) {
      const color = row.daysLeft > 1 ? '#2080f0' : 
                   row.daysLeft > 0 ? '#f0a020' : '#d03050'
      return h('span', { style: { color } }, row.daysLeft)
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    sorter: (row1: UntrainedMember, row2: UntrainedMember) => {
      const statusOrder = {
        '催促参训': 0,
        '未训退队': 1
      }
      return statusOrder[row1.status] - statusOrder[row2.status]
    },
    render(row: UntrainedMember) {
      return h(
        NTag,
        {
          type: row.status === '催促参训' ? 'warning' : 'error',
          round: true
        },
        { default: () => row.status }
      )
    }
  }
]

// 处理分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  // 保存到 localStorage
  localStorage.setItem('untrainedPageSize', pageSize.toString())
  // 如果当前页超出了新的页数范围，则调整到最后一页
  const maxPage = Math.ceil(filteredData.value.length / pageSize)
  if (pagination.value.page > maxPage) {
    pagination.value.page = maxPage
  }
}

// 添加自动更新功能
let updateTimer: number | null = null

const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    tableData.value = await loadFromStorage()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时启动定时更新
onMounted(async () => {
  try {
    loading.value = true
    // 立即执行一次加载，确保状态同步
    tableData.value = await loadFromStorage()
  } catch (e) {
    console.error('Failed to load initial data:', e)
    message.error('初始数据加载失败')
  } finally {
    loading.value = false
  }
  startAutoUpdate()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})

// 在状态更新函数中添加退队记录
const updateMemberStatus = () => {
  const members = JSON.parse(localStorage.getItem('training_members') || '[]')
  const updatedMembers = members.map((member: Member) => {
    if (member.stage === '未新训') {
      const joinDate = new Date(member.joinTime)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 3 - diffDays)
      const newStatus = daysLeft > 0 ? '催促参训' : '未训退队'
      // 如果状态从催促参训变为未训退队，添加退队记录
      if (member.status === '催促参训' && newStatus === '未训退队') {
        addQuitRecord(member, '未训退队')
      }
      member.status = newStatus
    }
    return member
  })
  
  localStorage.setItem('training_members', JSON.stringify(updatedMembers))
  return updatedMembers
}
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