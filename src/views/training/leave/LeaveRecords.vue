<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">请假记录</n-h2>
        <n-button type="primary" @click="handleAdd">
          添加请假
        </n-button>
      </n-space>
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
            { label: '请假中', value: '请假中' },
            { label: '等待销假', value: '等待销假' },
            { label: '已结束', value: '已结束' }
          ]"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择日期范围"
          style="width: 250px"
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

  <!-- 编辑请假记录弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? '编辑请假记录' : '添加请假'"
    :style="{ width: '500px' }"
  >
    <n-form
      ref="formRef"
      :model="formValue"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <n-form-item v-if="!isEdit" label="选择成员" path="memberId">
        <n-select
          v-model:value="formValue.memberId"
          :options="memberOptions"
          placeholder="请选择成员"
          filterable
          clearable
        />
      </n-form-item>
      
      <n-form-item label="起始日期" path="startDate">
        <n-date-picker
          v-model:value="formValue.startDate"
          type="date"
          clearable
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="结束日期" path="endDate">
        <n-date-picker
          v-model:value="formValue.endDate"
          type="date"
          clearable
          style="width: 100%"
          :is-date-disabled="(timestamp) => timestamp < formValue.startDate"
        />
      </n-form-item>
      
      <n-form-item label="请假原因" path="reason">
        <n-input
          v-model:value="formValue.reason"
          type="textarea"
          placeholder="请输入请假原因"
          :rows="3"
        />
      </n-form-item>
    </n-form>
    
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" class="submit-button" @click="handleSubmit">
          {{ isEdit ? '保存' : '确定' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { h, ref, computed, onMounted, onUnmounted } from 'vue'
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

// 扩展 Member 类型
interface LeaveRecord {
  id: string
  memberId: string
  memberName: string
  memberQQ: string
  startDate: string
  endDate: string
  status: '请假中' | '等待销假' | '已结束'
  reason: string
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async () => {
  try {
    loading.value = true
    // 获取所有请假记录
    const records = await LeaveService.getAllLeaveRecords()
    const members = await MemberService.getAllMembers()
    
    return records.map(record => {
      const member = members.find(m => m.objectId === record.memberId)
      return {
        id: record.objectId,
        memberId: record.memberId,
        memberName: member ? member.nickname : '未知成员',
        memberQQ: member ? member.qq : '',
        startDate: record.startDate,
        endDate: record.endDate,
        endedDate: record.endedDate || '',
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

// 表格数据
const tableData = ref<LeaveRecord[]>([])

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('leaveRecordsPageSize')) || 10,
  itemCount: computed(() => filteredData.value.length),
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`
})

// 搜索和筛选状态
const searchText = ref('')
const statusFilter = ref(null)
const dateRange = ref(null)

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
    const startTime = new Date(dateRange.value[0]).getTime()
    const endTime = new Date(dateRange.value[1]).getTime()
    result = result.filter(record => {
      const recordStartTime = new Date(record.startDate).getTime()
      const recordEndTime = new Date(record.endDate).getTime()
      return (recordStartTime >= startTime && recordStartTime <= endTime) ||
             (recordEndTime >= startTime && recordEndTime <= endTime) ||
             (recordStartTime <= startTime && recordEndTime >= endTime)
    })
  }

  return result
})

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
    sorter: (row1: LeaveRecord, row2: LeaveRecord) => Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '起始日期',
    key: 'startDate',
    width: 130,
    sorter: (row1: LeaveRecord, row2: LeaveRecord) => 
      new Date(row1.startDate).getTime() - new Date(row2.startDate).getTime()
  },
  {
    title: '结束日期',
    key: 'endDate',
    width: 130,
    sorter: (row1: LeaveRecord, row2: LeaveRecord) => 
      new Date(row1.endDate).getTime() - new Date(row2.endDate).getTime()
  },
  {
    title: '请假原因',
    key: 'reason',
    width: 200,
    sorter: 'default'
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    sorter: (row1: LeaveRecord, row2: LeaveRecord) => {
      const statusOrder = {
        '请假中': 0,
        '等待销假': 1,
        '已结束': 2
      }
      return statusOrder[row1.status] - statusOrder[row2.status]
    },
    render(row: LeaveRecord) {
      return h(
        NTag,
        {
          type: row.status === '请假中' ? 'warning' : 
                row.status === '等待销假' ? 'info' : 'success',
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
    render(row: LeaveRecord) {
      return h(
        NSpace,
        { align: 'center' },
        {
          default: () => [
            h(
              NButton,
              {
                quaternary: true,
                circle: true,
                size: 'small',
                style: 'color: #7B1FA2',
                onClick: () => handleEdit(row)
              },
              { icon: () => h(CreateOutline) }
            ),
            h(
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
                default: () => '确定删除该记录吗？'
              }
            )
          ]
        }
      )
    }
  }
]

// 添加成员选项
const memberOptions = ref([])

// 加载成员选项
const loadMemberOptions = async () => {
  try {
    const members = await MemberService.getAllMembers()
    memberOptions.value = members.map(member => ({
      label: `${member.nickname} (${member.qq})${member.gameId ? ` - ${member.gameId}` : ''}`,
      value: member.objectId
    }))
  } catch (e) {
    console.error('Failed to load member options:', e)
    message.error('加载成员列表失败')
  }
}

// 编辑表单相关
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const editingId = ref<string | null>(null)

// 添加编辑模式标记
const isEdit = ref(false)

// 修改表单值类型
const formValue = ref({
  memberId: null as string | null,
  startDate: null as number | null,
  endDate: null as number | null,
  reason: ''
})

// 修改表单验证规则
const rules = {
  memberId: {
    required: true,
    message: '请选择成员',
    trigger: ['blur', 'change']
  },
  startDate: {
    required: true,
    message: '请选择起始日期',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      return value ? Promise.resolve() : Promise.reject(rule.message)
    }
  },
  endDate: {
    required: true,
    message: '请选择结束日期',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      if (!value) return Promise.reject(rule.message)
      if (!formValue.value.startDate) return Promise.reject('请先选择起始日期')
      return value >= formValue.value.startDate ? 
        Promise.resolve() : 
        Promise.reject('结束日期不能早于起始日期')
    }
  },
  reason: {
    required: true,
    message: '请填写请假原因',
    trigger: ['blur', 'change']
  }
}

// 修改处理添加的函数
const handleAdd = () => {
  isEdit.value = false
  editingId.value = null
  formValue.value = {
    memberId: null,
    startDate: null,
    endDate: null,
    reason: ''
  }
  showModal.value = true
}

// 修改处理编辑的函数
const handleEdit = (row: LeaveRecord) => {
  isEdit.value = true
  editingId.value = row.id
  const [startYear, startMonth, startDay] = row.startDate.split('-').map(Number)
  const [endYear, endMonth, endDay] = row.endDate.split('-').map(Number)
  
  formValue.value = {
    memberId: row.memberId,
    startDate: Date.UTC(startYear, startMonth - 1, startDay),
    endDate: Date.UTC(endYear, endMonth - 1, endDay),
    reason: row.reason
  }
  showModal.value = true
}

// 修改处理删除的函数
const handleDelete = async (row: LeaveRecord) => {
  try {
    loading.value = true
    
    // 删除请假记录
    await LeaveService.deleteLeaveRecord(row.id)
    
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

// 修改处理提交的函数
const handleSubmit = async (e: MouseEvent) => {
  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        loading.value = true
        // 修改日期处理逻辑
        const startDate = new Date(formValue.value.startDate)
        const endDate = new Date(formValue.value.endDate)
        const data = {
          memberId: formValue.value.memberId,
          startDate: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`,
          endDate: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`,
          reason: formValue.value.reason,
          status: '请假中'
        }

        if (isEdit.value && editingId.value) {
          await LeaveService.updateLeaveRecord(editingId.value, data)
          message.success('更新成功')
        } else {
          // 检查成员是否已有未结束的请假记录
          const member = await MemberService.getMember(data.memberId)
          if (!member) {
            message.error('成员不存在')
            return
          }

          const records = await LeaveService.getAllLeaveRecords()
          const hasActiveLeave = records.some(record => 
            record.memberId === data.memberId && 
            (record.status === '请假中' || record.status === '等待销假')
          )

          if (hasActiveLeave) {
            message.error('该成员已有未结束的请假记录')
            return
          }

          await LeaveService.addLeaveRecord(data)
          message.success('添加成功')
        }

        // 重新加载数据
        tableData.value = await loadFromStorage()
        showModal.value = false
      } catch (e) {
        console.error('Failed to submit:', e)
        message.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// 处理分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  // 保存到 localStorage
  localStorage.setItem('leaveRecordsPageSize', pageSize.toString())
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

// 组件挂载时加载数据和启动定时更新
onMounted(async () => {
  await loadMemberOptions()
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
:deep(.n-button) {
  background-color: transparent !important;
}

:deep(.n-card-header .n-button) {
  background-color: #7B1FA2 !important;
  color: white !important;
}

:deep(.n-card-header .n-button:hover) {
  background-color: #9C27B0 !important;
  opacity: 1 !important;
}

:deep(.submit-button) {
  background-color: #7B1FA2 !important;
  color: white !important;
}

:deep(.submit-button:hover) {
  background-color: #9C27B0 !important;
  opacity: 1 !important;
}
</style>
 