<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">结束请假</n-h2>
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
            { label: '等待销假', value: '等待销假' },
            { label: '已结束', value: '已结束' }
          ]"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择结束日期范围"
          style="width: 250px"
        />
      </n-space>

      <n-data-table
        :columns="columns"
        :data="filteredData"
        :pagination="pagination"
        :loading="loading"
        @update:page="handlePageChange"
      />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  NButton, 
  NSpace, 
  NTag, 
  NPopconfirm,
  NForm,
  NFormItem,
  NDatePicker,
  NModal,
  useMessage,
  NSelect,
  NInput,
  NIcon
} from 'naive-ui'
import { CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { LeaveService, MemberService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 定义结束请假记录接口
interface EndedLeave {
  id: string
  memberId: string
  memberName: string
  memberQQ: string
  startDate: string
  endDate: string
  endedDate: string
  status: '已结束'
  reason: string
}

// 表格加载状态
const loading = ref(false)

// 搜索和筛选状态
const searchText = ref('')
const statusFilter = ref(null)
const dateRange = ref(null)

// 表格数据
const tableData = ref<EndedLeave[]>([])

// 修改表格数据的计算属性
const filteredData = computed(() => {
  let result = tableData.value

  // 搜索文本过滤
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    result = result.filter(record => 
      record.memberName.toLowerCase().includes(searchLower) ||
      record.memberQQ.toLowerCase().includes(searchLower)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(record => record.status === statusFilter.value)
  }

  // 日期范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startTime = new Date(dateRange.value[0])
    const endTime = new Date(dateRange.value[1])
    result = result.filter(record => {
      const recordStartTime = new Date(Date.UTC(
        ...record.startDate.split('-').map(Number),
        0, 0, 0
      ))
      const recordEndTime = new Date(Date.UTC(
        ...record.endDate.split('-').map(Number),
        0, 0, 0
      ))
      return (recordStartTime >= startTime && recordStartTime <= endTime) ||
             (recordEndTime >= startTime && recordEndTime <= endTime) ||
             (recordStartTime <= startTime && recordEndTime >= endTime)
    })
  }
  
  return result
})

// 计算总条数
const itemCount = computed(() => filteredData.value.length)

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('endLeavePageSize')) || 10,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`
})

// 监听itemCount的变化并更新pagination
watch(itemCount, (newCount) => {
  pagination.value = {
    ...pagination.value,
    itemCount: newCount
  }
})

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value = {
    ...pagination.value,
    pageSize
  }
  // 保存到 localStorage
  localStorage.setItem('endLeavePageSize', pageSize.toString())
  // 如果当前页超出了新的页数范围，则调整到最后一页
  const maxPage = Math.ceil(filteredData.value.length / pageSize)
  if (pagination.value.page > maxPage) {
    pagination.value = {
      ...pagination.value,
      page: maxPage
    }
  }
}

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value = {
    ...pagination.value,
    page
  }
}

// 从数据库加载数据
const loadFromStorage = async (): Promise<EndedLeave[]> => {
  try {
    loading.value = true
    // 获取所有请假记录
    const records = await LeaveService.getAllLeaveRecords()
    const members = await MemberService.getAllMembers()
    
    // 只显示"等待销假"状态的记录
    const waitingRecords = records.filter(record => record.status === '等待销假')
    
    return waitingRecords.map(record => {
      const member = members.find(m => m.objectId === record.memberId)
      return {
        id: record.objectId,
        memberId: record.memberId,
        memberName: member ? member.nickname : '未知成员',
        memberQQ: member ? member.qq : '',
        startDate: record.startDate,
        endDate: record.endDate,
        endedDate: '',
        status: record.status,
        reason: record.reason
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

// 表格列配置
const columns = [
  {
    title: '昵称',
    key: 'memberName',
    width: 130,
    sorter: 'default'
  },
  {
    title: 'QQ号',
    key: 'memberQQ',
    width: 130,
    sorter: (row1: EndedLeave, row2: EndedLeave) => Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '起始日期',
    key: 'startDate',
    width: 130,
    sorter: (row1: EndedLeave, row2: EndedLeave) => 
      new Date(row1.startDate).getTime() - new Date(row2.startDate).getTime()
  },
  {
    title: '结束日期',
    key: 'endDate',
    width: 130,
    sorter: (row1: EndedLeave, row2: EndedLeave) => 
      new Date(row1.endDate).getTime() - new Date(row2.endDate).getTime()
  },
  {
    title: '请假原因',
    key: 'reason',
    width: 200
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: EndedLeave) {
      return h(
        NTag,
        {
          type: 'warning',
          round: true
        },
        { default: () => row.status }
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row: EndedLeave) {
      return h(
        NSpace,
        { align: 'center' },
        {
          default: () => [
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleEndLeave(row)
              },
              {
                trigger: () => h(
                  NButton,
                  {
                    quaternary: true,
                    circle: true,
                    size: 'small',
                    style: 'color: #18a058'
                  },
                  { icon: () => h(CreateOutline) }
                ),
                default: () => '确定销假吗？'
              }
            )
          ]
        }
      )
    }
  }
]

// 修改处理删除的函数
const handleDelete = async (row: EndedLeave) => {
  try {
    loading.value = true
    
    // 删除已结束的请假记录
    await LeaveService.deleteEndedLeaveRecord(row.id)
    
    // 更新表格数据
    tableData.value = await loadFromStorage()
    message.success('删除成功')
  } catch (e) {
    console.error('Failed to delete record:', e)
    message.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 处理销假
const handleEndLeave = async (row: EndedLeave) => {
  try {
    loading.value = true
    const today = new Date()
    const endedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    // 调用销假方法
    await LeaveService.endLeave(row.id, endedDate)
    
    message.success('销假成功')
    // 重新加载数据
    tableData.value = await loadFromStorage()
  } catch (e) {
    console.error('Failed to end leave:', e)
    message.error('销假失败')
  } finally {
    loading.value = false
  }
}

// 添加自动更新功能
let updateTimer: number | null = null

const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    tableData.value = await loadFromStorage()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时加载数据和启动定时更新
onMounted(async () => {
  tableData.value = await loadFromStorage()
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
:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}

:deep(.n-tag--success) {
  background-color: #e3f9e9;
  color: #18a058;
  border: 1px solid #18a058;
}
</style> 