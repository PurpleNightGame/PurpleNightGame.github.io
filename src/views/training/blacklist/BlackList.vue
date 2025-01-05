<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">黑点记录</n-h2>
        <n-button type="primary" @click="handleAdd">
          添加黑点
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
            { label: '未消除', value: '未消除' },
            { label: '已消除', value: '已消除' }
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
        :loading="loading"
      />
    </n-space>
  </n-card>

  <!-- 编辑黑点记录弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? '编辑黑点记录' : '添加黑点'"
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
      
      <n-form-item label="日期" path="date">
        <n-date-picker
          v-model:value="formValue.date"
          type="date"
          clearable
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

      <n-form-item label="黑点数" path="points">
        <n-input-number
          v-model:value="formValue.points"
          :min="1"
          style="width: 100%"
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
  NInputNumber,
  NIcon,
  NH2,
  NCard
} from 'naive-ui'
import { CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { BlacklistService, MemberService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 定义黑点记录接口
interface BlacklistRecord {
  id: string
  memberId: string
  memberName: string
  memberQQ: string
  date: string
  reason: string
  points: number
  status: '未消除' | '已消除'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<BlacklistRecord[]> => {
  try {
    loading.value = true
    const records = await BlacklistService.getAllBlacklistRecords()
    const members = await MemberService.getAllMembers()
    
    return records.map(record => {
      const member = members.find(m => m.objectId === record.memberId)
      return {
        id: record.objectId,
        memberId: record.memberId,
        memberName: member ? member.nickname : '未知成员',
        memberQQ: member ? member.qq : '',
        date: record.date,
        reason: record.reason,
        points: record.points,
        status: record.status
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
      const recordTime = new Date(record.date).getTime()
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
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '日期',
    key: 'date',
    width: 130,
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => 
      new Date(row1.date).getTime() - new Date(row2.date).getTime()
  },
  {
    title: '原因',
    key: 'reason',
    width: 200
  },
  {
    title: '黑点数',
    key: 'points',
    width: 100,
    sorter: (row1: BlacklistRecord, row2: BlacklistRecord) => row1.points - row2.points
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: BlacklistRecord) {
      return h(
        NTag,
        {
          type: row.status === '未消除' ? 'warning' : 'success',
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
    render(row: BlacklistRecord) {
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

// 编辑表单相关
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const editingId = ref<string | null>(null)

// 添加编辑模式标记
const isEdit = ref(false)

// 修改表单值类型
const formValue = ref({
  memberId: null as string | null,
  date: null as number | null,
  reason: '',
  points: 1
})

// 修改表单验证规则
const rules = {
  memberId: {
    required: true,
    message: '请选择成员',
    trigger: ['blur', 'change']
  },
  date: {
    required: true,
    message: '请选择日期',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      return value ? Promise.resolve() : Promise.reject(rule.message)
    }
  },
  reason: {
    required: true,
    message: '请填写原因',
    trigger: ['blur', 'change']
  },
  points: {
    required: true,
    message: '请填写黑点数',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      if (!value || value < 1) return Promise.reject('黑点数必须大于0')
      return Promise.resolve()
    }
  }
}

// 修改处理添加的函数
const handleAdd = () => {
  isEdit.value = false
  editingId.value = null
  formValue.value = {
    memberId: null,
    date: null,
    reason: '',
    points: 1
  }
  showModal.value = true
}

// 修改处理编辑的函数
const handleEdit = (row: BlacklistRecord) => {
  isEdit.value = true
  editingId.value = row.id
  const [year, month, day] = row.date.split('-').map(Number)
  
  formValue.value = {
    memberId: row.memberId,
    date: new Date(year, month - 1, day).getTime(),
    reason: row.reason,
    points: row.points
  }
  showModal.value = true
}

// 修改处理删除的函数
const handleDelete = async (row: BlacklistRecord) => {
  try {
    loading.value = true
    
    // 删除黑点记录
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

// 修改处理提交的函数
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true
    
    const date = new Date(formValue.value.date!)
    
    const recordData = {
      memberId: formValue.value.memberId!,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      reason: formValue.value.reason,
      points: formValue.value.points,
      status: '未消除' as const
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

:deep(.n-tag--warning) {
  background-color: #fdf0e8;
  color: #f0a020;
  border: 1px solid #f0a020;
}

:deep(.n-tag--success) {
  background-color: #e3f9e9;
  color: #18a058;
  border: 1px solid #18a058;
}
</style> 