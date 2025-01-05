<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">黑点记录</n-h2>
        <n-button type="primary" @click="handleAdd">
          添加记录
        </n-button>
      </n-space>
    </template>

    <n-space vertical>
      <n-space>
        <n-input
          v-model:value="searchText"
          placeholder="搜索昵称/QQ号/记录人"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <n-icon><search-outline /></n-icon>
          </template>
        </n-input>
        <n-select
          v-model:value="levelFilter"
          placeholder="等级筛选"
          clearable
          :options="levelOptions"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择记录日期范围"
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

  <!-- 编辑记录弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? '编辑黑点记录' : '添加黑点记录'"
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
      
      <n-form-item label="等级" path="level">
        <n-select
          v-model:value="formValue.level"
          :options="levelOptions"
          placeholder="请选择等级"
        />
      </n-form-item>
      
      <n-form-item label="记录人" path="recorder">
        <n-input
          v-model:value="formValue.recorder"
          placeholder="请输入记录人"
        />
      </n-form-item>
      
      <n-form-item label="记录日期" path="recordDate">
        <n-date-picker
          v-model:value="formValue.recordDate"
          type="date"
          clearable
          :is-date-disabled="disableFutureDate"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="原因" path="reason">
        <n-input
          v-model:value="formValue.reason"
          type="textarea"
          placeholder="请输入原因"
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
  NIcon,
  NH2,
  NCard
} from 'naive-ui'
import { CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { BlacklistService, MemberService, BlacklistQuitService, LeaveService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 定义黑点记录接口
interface BlacklistRecord {
  id: string
  memberId: string
  memberName: string
  memberQQ: string
  level: '警告' | '严重警告'
  recorder: string
  recordDate: string
  reason: string
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<BlacklistRecord[]> => {
  try {
    loading.value = true
    const records = await BlacklistService.getAllBlacklistRecords()
    const members = await MemberService.getAllMembers()
    const blacklistRemoveRecords = await BlacklistService.getAllBlacklistRemoveRecords()
    const blacklistQuitRecords = await BlacklistQuitService.getAllBlacklistQuitRecords()
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    
    // 按成员ID分组记录
    const memberRecords = new Map()
    records.forEach(record => {
      const memberRecordList = memberRecords.get(record.memberId) || []
      memberRecordList.push(record)
      memberRecords.set(record.memberId, memberRecordList)
    })
    
    // 处理每个成员的记录
    for (const [memberId, recordList] of memberRecords.entries()) {
      // 按日期排序记录
      recordList.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
      
      // 获取最新记录
      const latestRecord = recordList[0]
      const latestDate = new Date(latestRecord.recordDate)
      const now = new Date()
      
      // 计算时间差（毫秒）
      const timeDiff = now.getTime() - latestDate.getTime()
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      
      // 检查是否已经有消除记录
      const hasRemoveRecord = blacklistRemoveRecords.some(record => 
        record.memberId === memberId && 
        new Date(record.recordDate).getTime() > latestDate.getTime()
      )

      // 检查成员是否处于请假状态
      const isOnLeave = leaveRecords.some(record => 
        record.memberId === memberId && 
        record.status === '请假中'
      )
      
      // 如果最新记录超过1个月（30天）且没有更新的消除记录，且不在请假中
      if (daysDiff > 30 && !hasRemoveRecord && !isOnLeave) {
        try {
          // 添加到黑点消除记录
          await BlacklistService.addBlacklistRemoveRecord({
            memberId,
            recordDate: now.toISOString().split('T')[0],
            reason: '自动消除（超过1个月无新增黑点）',
            recorder: 'System'
          })

          // 删除该成员的所有黑点记录
          for (const record of recordList) {
            await BlacklistService.deleteBlacklistRecord(record.id)
          }
        } catch (e) {
          console.error('Failed to process blacklist records:', e)
        }
      }
      
      // 如果黑点数大于等于4且还没有违规退队记录
      if (recordList.length >= 4 && !blacklistQuitRecords.some(record => record.memberId === memberId)) {
        try {
          // 添加到违规退队记录
          await BlacklistQuitService.addBlacklistQuitRecord({
            memberId,
            quitDate: now.toISOString().split('T')[0],
            reason: '自动记录（黑点数达到4个）',
            recorder: 'System',
            quitType: '违规退队'
          })
        } catch (e) {
          console.error('Failed to add blacklist quit record:', e)
        }
      }
    }
    
    // 重新获取更新后的记录
    const updatedRecords = await BlacklistService.getAllBlacklistRecords()
    return updatedRecords.map(record => {
      const member = members.find(m => m.objectId === record.memberId)
      return {
        id: record.objectId,
        memberId: record.memberId,
        memberName: member ? member.nickname : '未知成员',
        memberQQ: member ? member.qq : '',
        level: record.level,
        recorder: record.recorder,
        recordDate: record.recordDate,
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
const tableData = ref<BlacklistRecord[]>([])

// 搜索和筛选状态
const searchText = ref('')
const levelFilter = ref(null)
const dateRange = ref(null)

// 修改表格数据的计算属性
const filteredData = computed(() => {
  let result = tableData.value

  // 搜索文本过滤
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    result = result.filter(record => 
      record.memberName.toLowerCase().includes(searchLower) ||
      record.memberQQ.toLowerCase().includes(searchLower) ||
      record.recorder.toLowerCase().includes(searchLower)
    )
  }

  // 等级过滤
  if (levelFilter.value) {
    result = result.filter(record => record.level === levelFilter.value)
  }

  // 日期范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startTime = new Date(dateRange.value[0]).getTime()
    const endTime = new Date(dateRange.value[1]).getTime()
    result = result.filter(record => {
      const recordTime = new Date(record.recordDate).getTime()
      return recordTime >= startTime && recordTime <= endTime
    })
  }

  return result
})

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

// 等级选项
const levelOptions = [
  { label: '警告', value: '警告' },
  { label: '严重警告', value: '严重警告' }
]

// 表格列定义
const columns = [
  {
    title: '成员昵称',
    key: 'memberName',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      row1.memberName.localeCompare(row2.memberName)
  },
  {
    title: 'QQ号',
    key: 'memberQQ',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '等级',
    key: 'level',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      row1.level.localeCompare(row2.level),
    render: (row: BlacklistRecord) => {
      const type = row.level === '严重警告' ? 'error' : 'warning'
      return h(NTag, { type, round: true }, { default: () => row.level })
    }
  },
  {
    title: '记录日期',
    key: 'recordDate',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      new Date(row1.recordDate).getTime() - new Date(row2.recordDate).getTime()
  },
  {
    title: '原因',
    key: 'reason',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      row1.reason.localeCompare(row2.reason)
  },
  {
    title: '记录人',
    key: 'recorder',
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      row1.recorder.localeCompare(row2.recorder)
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row: BlacklistRecord) => {
      return h(NSpace, { justify: 'center', align: 'center', size: 'small' }, {
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
              default: () => '确认删除？',
              trigger: () => h(
                NButton,
                {
                  quaternary: true,
                  circle: true,
                  size: 'small',
                  style: 'color: #d03050'
                },
                { icon: () => h(TrashOutline) }
              )
            }
          )
        ]
      })
    }
  }
]

// 表单相关
const showModal = ref(false)
const isEdit = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<typeof NForm | null>(null)

const formValue = ref({
  memberId: null,
  level: null,
  recorder: '',
  recordDate: null,
  reason: ''
})

const rules = {
  memberId: {
    required: true,
    message: '请选择成员',
    trigger: 'blur'
  },
  level: {
    required: true,
    message: '请选择等级',
    trigger: 'blur'
  },
  recorder: {
    required: true,
    message: '请输入记录人',
    trigger: 'blur'
  },
  recordDate: {
    required: true,
    type: 'number',
    message: '请选择记录日期',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: any) => {
      return value !== null && value !== undefined && !isNaN(value)
    }
  },
  reason: {
    required: true,
    message: '请输入原因',
    trigger: 'blur'
  }
}

// 禁用未来日期
const disableFutureDate = (timestamp: number) => {
  return timestamp > Date.now()
}

// 处理添加
const handleAdd = () => {
  isEdit.value = false
  editingId.value = null
  formValue.value = {
    memberId: null,
    level: '',
    recorder: '',
    recordDate: null,
    reason: ''
  }
  showModal.value = true
}

// 处理编辑
const handleEdit = (row: BlacklistRecord) => {
  isEdit.value = true
  editingId.value = row.id
  
  formValue.value = {
    memberId: row.memberId,
    level: row.level,
    recorder: row.recorder,
    recordDate: row.recordDate ? new Date(row.recordDate).getTime() : null,
    reason: row.reason
  }
  showModal.value = true
}

// 处理删除
const handleDelete = async (row: BlacklistRecord) => {
  try {
    loading.value = true
    await BlacklistService.deleteBlacklistRecord(row.id)
    
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

// 处理提交
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true
    
    const date = new Date(formValue.value.recordDate!)
    
    const recordData = {
      memberId: formValue.value.memberId!,
      level: formValue.value.level,
      recorder: formValue.value.recorder,
      recordDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      reason: formValue.value.reason
    }
    
    if (isEdit.value && editingId.value) {
      // 更新记录
      await BlacklistService.updateBlacklistRecord(editingId.value, recordData)
    } else {
      // 添加新记录
      await BlacklistService.addBlacklistRecord(recordData)
    }

    // 重新加载数据
    tableData.value = await loadFromStorage()
    
    showModal.value = false
    message.success(isEdit.value ? '编辑成功' : '添加成功')
  } catch (e) {
    console.error('Failed to submit:', e)
    message.error(isEdit.value ? '编辑失败' : '添加失败')
  } finally {
    loading.value = false
  }
}

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: computed(() => filteredData.value.length),
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`
})

// 处理分页
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
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

:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}
</style> 