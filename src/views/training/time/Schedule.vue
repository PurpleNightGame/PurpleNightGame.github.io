<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">日期总表</n-h2>
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
        <n-date-picker
          v-model:value="joinDateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="加入时间范围"
          style="width: 250px"
        />
        <n-date-picker
          v-model:value="lastTrainingDateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="最后一次新训日期范围"
          style="width: 250px"
        />
        <n-date-picker
          v-model:value="passDateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="考核通过日期范围"
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

  <!-- 编辑日期弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="编辑日期"
    :style="{ width: '500px' }"
  >
    <n-form
      ref="formRef"
      :model="formValue"
      :rules="rules"
      label-placement="left"
      label-width="120"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="加入时间" path="joinTime">
        <n-date-picker
          v-model:value="formValue.joinTime"
          type="date"
          clearable
          :locale="zhCN.DatePicker"
          :is-date-disabled="(timestamp) => timestamp > Date.now()"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="最后一次新训日期" path="lastTrainingDate">
        <n-date-picker
          v-model:value="formValue.lastTrainingDate"
          type="date"
          clearable
          :locale="zhCN.DatePicker"
          :is-date-disabled="(timestamp) => timestamp > Date.now()"
          style="width: 100%"
        />
      </n-form-item>
    </n-form>
    
    <template #footer>
      <n-space justify="end">
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" class="submit-button" @click="handleSubmit">
          保存
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
  useMessage,
  useDialog,
  NInput,
  NSelect,
  NDatePicker,
  NIcon,
  zhCN
} from 'naive-ui'
import { SearchOutline, CreateOutline } from '@vicons/ionicons5'
import { MemberService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()
const dialog = useDialog()

// 扩展 Member 类型
interface ScheduleMember extends Member {
  objectId?: string
  lastTrainingDate?: string
  passDate?: string
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<ScheduleMember[]> => {
  try {
    loading.value = true
    const members = await MemberService.getAllMembers()
    return members.map((member: any) => ({
      ...member,
      id: member.objectId,
      lastTrainingDate: member.lastTrainingDate === 'null' ? '' : member.lastTrainingDate || '',
      passDate: member.passDate || ''
    }))
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 表格数据
const tableData = ref<ScheduleMember[]>([])

// 搜索和筛选状态
const searchText = ref('')
const joinDateRange = ref(null)
const lastTrainingDateRange = ref(null)
const passDateRange = ref(null)

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

  // 加入时间范围过滤
  if (joinDateRange.value && joinDateRange.value[0] && joinDateRange.value[1]) {
    const startTime = new Date(joinDateRange.value[0]).getTime()
    const endTime = new Date(joinDateRange.value[1]).getTime()
    result = result.filter(member => {
      const joinTime = new Date(member.joinTime).getTime()
      return joinTime >= startTime && joinTime <= endTime
    })
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

  // 考核通过日期范围过滤
  if (passDateRange.value && passDateRange.value[0] && passDateRange.value[1]) {
    const startTime = new Date(passDateRange.value[0]).getTime()
    const endTime = new Date(passDateRange.value[1]).getTime()
    result = result.filter(member => {
      if (!member.passDate) return false
      const passDate = new Date(member.passDate).getTime()
      return passDate >= startTime && passDate <= endTime
    })
  }

  return result
})

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

// 编辑表单相关
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const editingId = ref<string | null>(null)
const formValue = ref({
  joinTime: null as number | null,
  lastTrainingDate: null as number | null
})

// 表单验证规则
const rules = {
  joinTime: {
    required: true,
    type: 'number',
    message: '请选择加入时间',
    trigger: ['blur', 'change']
  },
  lastTrainingDate: {
    required: false,
    type: 'number',
    trigger: ['blur', 'change']
  }
}

// 处理编辑
const handleEdit = (row: ScheduleMember) => {
  editingId.value = row.id
  formValue.value = {
    joinTime: row.joinTime ? new Date(row.joinTime).getTime() : null,
    lastTrainingDate: row.lastTrainingDate ? new Date(row.lastTrainingDate).getTime() : null
  }
  showModal.value = true
}

// 处理提交
const handleSubmit = async (e: MouseEvent) => {
  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      try {
        loading.value = true
        const memberData: Record<string, string> = {}

        // 处理加入时间
        if (formValue.value.joinTime) {
          const date = new Date(formValue.value.joinTime)
          memberData.joinTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }

        // 处理最后一次新训日期
        if (formValue.value.lastTrainingDate) {
          const date = new Date(formValue.value.lastTrainingDate)
          memberData.lastTrainingDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

          // 获取当前成员信息
          const currentMember = tableData.value.find(member => member.id === editingId.value)
          if (currentMember && currentMember.stage === '未新训') {
            const shouldUpdateStage = await dialog.warning({
              title: '提示',
              content: '成员处于未新训状态，将默认修改为新训初期。',
              positiveText: '知道了'
            })

            if (shouldUpdateStage) {
              memberData.stage = '新训初期'
              memberData.status = '正常'
            }
          }
        } else {
          // 如果清空了最后一次新训日期，将其设置为空字符串
          memberData.lastTrainingDate = ''
          // 获取当前成员信息
          const currentMember = tableData.value.find(member => member.id === editingId.value)
          if (currentMember && currentMember.stage === '新训初期') {
            const shouldUpdateStage = await dialog.warning({
              title: '提示',
              content: '清空新训日期可能影响成员阶段，此成员将恢复为未新训状态。',
              positiveText: '知道了'
            })

            if (shouldUpdateStage) {
              memberData.stage = '未新训'
            }
          }
        }

        console.log('提交的数据:', memberData)
        
        await MemberService.updateMember(editingId.value!, memberData)
        
        // 更新表格数据
        tableData.value = await loadFromStorage()
        message.success('更新成功')
        showModal.value = false
      } catch (e) {
        console.error('Failed to update member:', e)
        message.error('更新失败')
      } finally {
        loading.value = false
      }
    }
  })
}

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
    sorter: (row1: ScheduleMember, row2: ScheduleMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '加入时间',
    key: 'joinTime',
    width: 130,
    sorter: (row1: ScheduleMember, row2: ScheduleMember) => 
      new Date(row1.joinTime).getTime() - new Date(row2.joinTime).getTime()
  },
  {
    title: '最后一次新训日期',
    key: 'lastTrainingDate',
    width: 150,
    render(row: ScheduleMember) {
      return row.lastTrainingDate || ''
    },
    sorter: (row1: ScheduleMember, row2: ScheduleMember) => {
      if (!row1.lastTrainingDate && !row2.lastTrainingDate) return 0
      if (!row1.lastTrainingDate) return -1
      if (!row2.lastTrainingDate) return 1
      return new Date(row1.lastTrainingDate).getTime() - new Date(row2.lastTrainingDate).getTime()
    }
  },
  {
    title: '考核通过日期',
    key: 'passDate',
    width: 130,
    sorter: (row1: ScheduleMember, row2: ScheduleMember) => {
      if (!row1.passDate && !row2.passDate) return 0
      if (!row1.passDate) return -1
      if (!row2.passDate) return 1
      return new Date(row1.passDate).getTime() - new Date(row2.passDate).getTime()
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render(row: ScheduleMember) {
      return h(
        NButton,
        {
          quaternary: true,
          circle: true,
          size: 'small',
          style: 'color: #7B1FA2',
          onClick: () => handleEdit(row)
        },
        { icon: () => h(CreateOutline) }
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
</script>

<style scoped>
:deep(.n-button) {
  background-color: transparent !important;
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