<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">催促名单</n-h2>
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
            { label: '催促新训', value: '催促新训' },
            { label: '超时退队', value: '超时退队' }
          ]"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="lastTrainingDateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="最后一次新训日期范围"
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
import { TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { MemberService, QuitService, LeaveService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 扩展 Member 类型
interface ReminderMember extends Member {
  objectId?: string
  lastTrainingDate: string
  daysLeft: number
  status: '催促新训' | '超时退队'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<ReminderMember[]> => {
  try {
    loading.value = true
    const [members, leaveRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords()
    ])
    
    // 过滤出需要显示在催促名单中的成员
    return members
      .filter((member: any) => {
        // 如果成员已通过考核，不显示在催促名单中
        if (member.passDate) {
          return false
        }

        // 检查是否处于请假状态（包括请假中和等待销假）
        const isOnLeave = leaveRecords.some(record => 
          record.memberId === member.objectId && 
          (record.status === '请假中' || record.status === '等待销假')
        )
        
        // 如果在请假中或留队申请已通过，不显示在催促名单中
        if (isOnLeave || member.leaveRequest === '通过') {
          return false
        }

        // 如果没有最后一次新训日期或日期为空字符串，不显示在催促名单中
        if (!member.lastTrainingDate || member.lastTrainingDate === '' || member.lastTrainingDate === 'null') {
          return false
        }

        // 计算距离最后一次新训的天数
        const lastDate = new Date(member.lastTrainingDate)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        // 只有超过7天的成员才显示在催促名单中
        return diffDays >= 7
      })
      .map((member: any) => {
        const lastTrainingDate = member.lastTrainingDate
        const daysLeft = calculateDaysLeft(lastTrainingDate)
        const status = calculateStatus(lastTrainingDate)

        // 如果状态是超时退队，自动添加到退队记录
        if (status === '超时退队') {
          handleAutoQuit({
            ...member,
            id: member.objectId
          })
        }

        return {
          id: member.objectId,
          nickname: member.nickname,
          qq: member.qq,
          gameId: member.gameId || '',
          joinTime: member.joinTime,
          stage: member.stage,
          lastTrainingDate,
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

// 自动处理超时退队
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
      record.memberId === member.objectId && record.quitType === '超时退队'
    )
    
    if (!hasQuitRecord) {
      const quitData = {
        memberId: member.objectId,
        memberName: member.nickname,
        memberQQ: member.qq,
        quitDate: new Date().toISOString().split('T')[0],
        quitType: '超时退队',
        reason: '超过10天未新训',
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
        status: '超时退队'
      })

      console.log('已自动创建超时退队记录:', member.nickname)
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
const tableData = ref<ReminderMember[]>([])

// 计算需要显示的数据
const reminderData = computed(() => {
  return tableData.value.map(member => ({
    ...member,
    daysLeft: calculateDaysLeft(member.lastTrainingDate),
    status: calculateStatus(member.lastTrainingDate)
  }))
})

// 计算剩余天数
const calculateDaysLeft = (lastTrainingDate: string): number => {
  if (!lastTrainingDate) return 0
  
  const lastDate = new Date(lastTrainingDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // 如果不到7天，不需要显示在催促名单中
  if (diffDays < 7) return -1
  
  // 如果超过7天，开始倒数3天
  if (diffDays >= 7) {
    return Math.max(0, 3 - (diffDays - 7))
  }
  
  return 0
}

// 计算状态
const calculateStatus = (lastTrainingDate: string): '催促新训' | '超时退队' => {
  if (!lastTrainingDate) return '催促新训'
  
  const lastDate = new Date(lastTrainingDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // 如果超过10天未新训，则为超时退队
  if (diffDays >= 10) {
    return '超时退队'
  }
  
  // 如果超过7天但不到10天，则为催促新训
  if (diffDays >= 7) {
    return '催促新训'
  }
  
  return '催促新训'
}

// 搜索和筛选状态
const searchText = ref('')
const statusFilter = ref(null)
const lastTrainingDateRange = ref(null)
const minDaysLeft = ref<number | null>(null)
const maxDaysLeft = ref<number | null>(null)

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('remindersPageSize')) || 10,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`,
  itemCount: computed(() => filteredData.value.length)
})

// 处理分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  // 保存到 localStorage
  localStorage.setItem('remindersPageSize', pageSize.toString())
  // 如果当前页超出了新的页数范围，则调整到最后一页
  const maxPage = Math.ceil(filteredData.value.length / pageSize)
  if (pagination.value.page > maxPage) {
    pagination.value.page = maxPage
  }
}

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

  // 最后一次新训日期范围过滤
  if (lastTrainingDateRange.value && lastTrainingDateRange.value[0] && lastTrainingDateRange.value[1]) {
    const startTime = new Date(lastTrainingDateRange.value[0]).getTime()
    const endTime = new Date(lastTrainingDateRange.value[1]).getTime()
    result = result.filter(member => {
      if (!member.lastTrainingDate) return false
      const lastTrainingDate = new Date(member.lastTrainingDate).getTime()
      return lastTrainingDate >= startTime && lastTrainingDate <= endTime
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
    sorter: (row1: ReminderMember, row2: ReminderMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '最后一次新训日期',
    key: 'lastTrainingDate',
    width: 150,
    sorter: (row1: ReminderMember, row2: ReminderMember) => 
      new Date(row1.lastTrainingDate).getTime() - new Date(row2.lastTrainingDate).getTime()
  },
  {
    title: '剩余天数',
    key: 'daysLeft',
    width: 100,
    sorter: (row1: ReminderMember, row2: ReminderMember) => row1.daysLeft - row2.daysLeft,
    render(row: ReminderMember) {
      const color = row.daysLeft > 1 ? '#2080f0' : 
                   row.daysLeft > 0 ? '#f0a020' : '#d03050'
      return h('span', { style: { color } }, row.daysLeft)
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    sorter: (row1: ReminderMember, row2: ReminderMember) => {
      const statusOrder = {
        '催促新训': 0,
        '超时退队': 1
      }
      return statusOrder[row1.status] - statusOrder[row2.status]
    },
    render(row: ReminderMember) {
      return h(
        NTag,
        {
          type: row.status === '催促新训' ? 'warning' : 'error',
          round: true
        },
        { default: () => row.status }
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render(row: ReminderMember) {
      return h(
        NPopconfirm,
        {
          onPositiveClick: () => handleDelete(row)
        },
        {
          trigger: () => h(
            NButton,
            {
              quaternary: true,
              circle: true,
              size: 'small',
              style: 'color: #d03050'
            },
            { icon: () => h(TrashOutline) }
          ),
          default: () => '确定从催促名单中移除吗？'
        }
      )
    }
  }
]

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
    // 如果成员已通过考核，不进行状态更新
    if (member.passDate) {
      return member
    }

    // 如果留队申请已通过，且不是违规退队状态，则不更新状态
    if (member.leaveRequest === '通过' && member.status !== '违规退队') {
      return member
    }

    if (member.lastTrainingDate) {
      const lastDate = new Date(member.lastTrainingDate)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays >= 7) {
        const daysLeft = Math.max(0, 3 - (diffDays - 7))
        const newStatus = daysLeft > 0 ? '催促新训' : '超时退队'
        // 如果状态从催促新训变为超时退队，添加退队记录
        if (member.status === '催促新训' && newStatus === '超时退队') {
          addQuitRecord(member, '超时退队')
        }
        member.status = newStatus
      }
    }
    return member
  })
  
  localStorage.setItem('training_members', JSON.stringify(updatedMembers))
  return updatedMembers
}

// 处理删除操作
const handleDelete = (row: ReminderMember) => {
  try {
    // 从表格数据中移除
    tableData.value = tableData.value.filter(m => m.id !== row.id)
    // 更新分页数据
    const currentPage = pagination.value.page
    const newItemCount = tableData.value.length
    pagination.value = {
      ...pagination.value,
      itemCount: newItemCount,
      // 如果当前页没有数据了，则回到上一页
      page: newItemCount === 0 ? 1 : 
            Math.ceil(newItemCount / pagination.value.pageSize) < currentPage ? 
            Math.max(1, currentPage - 1) : currentPage
    }
    
    message.success('已从催促名单中移除')
  } catch (e) {
    console.error('Failed to delete reminder:', e)
    message.error('操作失败，请重试')
  }
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