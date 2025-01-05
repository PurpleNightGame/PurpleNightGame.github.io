<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">成员状态</n-h2>
    </template>

    <n-space vertical>
      <n-space>
        <n-input
          v-model:value="searchText"
          placeholder="搜索昵称/QQ号/游戏ID"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <n-icon><search-outline /></n-icon>
          </template>
        </n-input>
        <n-select
          v-model:value="stageFilter"
          placeholder="阶段筛选"
          clearable
          :options="stageOptions"
          style="width: 120px"
        />
        <n-select
          v-model:value="leaveFilter"
          placeholder="请假状态"
          clearable
          :options="[
            { label: '请假中', value: true },
            { label: '未请假', value: false }
          ]"
          style="width: 120px"
        />
        <n-select
          v-model:value="leaveRequestFilter"
          placeholder="留队申请"
          clearable
          :options="leaveRequestOptions"
          style="width: 120px"
        />
        <n-select
          v-model:value="statusFilter"
          placeholder="状态筛选"
          clearable
          :options="statusOptions"
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

  <!-- 编辑状态弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="编辑状态"
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
      <n-form-item label="留队申请" path="leaveRequest">
        <n-select
          v-model:value="formValue.leaveRequest"
          :options="leaveRequestOptions"
          placeholder="请选择申请状态"
        />
      </n-form-item>
      
      <n-form-item label="状态" path="status">
        <n-select
          v-model:value="formValue.status"
          :options="statusOptions"
          placeholder="请选择状态"
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
import { h, ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  NButton, 
  NSpace, 
  NTag, 
  NPopconfirm, 
  useMessage,
  NInput,
  NSelect,
  NIcon,
  NForm,
  NFormItem,
  NModal,
  NH2,
  NCard,
  NDataTable
} from 'naive-ui'
import { CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { calculateMemberStatus } from '../../../utils/memberStatus'
import { MemberService, LeaveService, QuitService, BlacklistQuitService, BlacklistService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 扩展 Member 类型
interface ExtendedMember extends Member {
  objectId?: string
  onLeave?: boolean
  leaveRequest?: '未申请' | '未通过' | '通过'
  status: '正常' | '异常' | '催促参训' | '未训退队' | '超时退队' | '违规退队'
}

// 表单类型
interface FormValue {
  leaveRequest: '未申请' | '未通过' | '通过'
  status: '正常' | '异常' | '催促参训' | '未训退队' | '超时退队' | '违规退队'
}

// 表单默认值
const defaultForm: FormValue = {
  leaveRequest: '未申请',
  status: '正常'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<ExtendedMember[]> => {
  try {
    loading.value = true
    const [members, leaveRecords, quitRecords, blacklistQuitRecords, blacklistRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords(),
      QuitService.getAllQuitRecords(),
      BlacklistQuitService.getAllBlacklistQuitRecords(),
      BlacklistService.getAllBlacklistRecords()
    ])
    
    return members.map((member: any) => {
      // 检查所有未结束的请假记录
      const hasActiveLeaves = leaveRecords.some((record: any) => 
        record.memberId === member.objectId && 
        (record.status === '请假中' || record.status === '等待销假')
      )

      // 使用统一的状态计算函数
      const status = calculateMemberStatus(member, blacklistRecords, leaveRecords)

      return {
        ...member,
        id: member.objectId,
        onLeave: hasActiveLeaves,
        leaveRequest: member.leaveRequest || '未申请',
        status: status
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
const tableData = ref<ExtendedMember[]>([])

// 搜索和筛选状态
const searchText = ref('')
const stageFilter = ref(null)
const leaveFilter = ref(null)
const leaveRequestFilter = ref(null)
const statusFilter = ref(null)

// 修改表格数据的计算属性
const filteredData = computed(() => {
  let result = tableData.value

  // 搜索文本过滤
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    result = result.filter(member => 
      member.nickname.toLowerCase().includes(searchLower) ||
      member.qq.toLowerCase().includes(searchLower) ||
      (member.gameId && member.gameId.toLowerCase().includes(searchLower))
    )
  }

  // 阶段过滤
  if (stageFilter.value) {
    result = result.filter(member => member.stage === stageFilter.value)
  }

  // 请假状态过滤
  if (leaveFilter.value !== null) {
    result = result.filter(member => member.onLeave === leaveFilter.value)
  }

  // 留队申请过滤
  if (leaveRequestFilter.value) {
    result = result.filter(member => member.leaveRequest === leaveRequestFilter.value)
  }

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(member => member.status === statusFilter.value)
  }

  return result
})

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('memberStatusPageSize')) || 10,
  itemCount: computed(() => filteredData.value.length),
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`
})

// 留队申请选项
const leaveRequestOptions = [
  { label: '未申请', value: '未申请' },
  { label: '未通过', value: '未通过' },
  { label: '通过', value: '通过' }
]

// 阶段选项
const stageOptions = [
  { label: '未新训', value: '未新训' },
  { label: '新训初期', value: '新训初期' },
  { label: '新训1期', value: '新训1期' },
  { label: '新训2期', value: '新训2期' },
  { label: '新训3期', value: '新训3期' },
  { label: '新训准考', value: '新训准考' },
  { label: '紫夜', value: '紫夜' }
]

// 状态选项
const statusOptions = [
  { label: '正常', value: '正常' },
  { label: '异常', value: '异常' },
  { label: '催促参训', value: '催促参训' },
  { label: '未训退队', value: '未训退队' },
  { label: '超时退队', value: '超时退队' },
  { label: '违规退队', value: '违规退队' }
]

// 获取状态标签类型
const getStatusType = (status: string) => {
  switch (status) {
    case '正常':
      return 'success'
    case '异常':
      return 'error'
    case '催促参训':
    case '催促新训':
      return 'warning'
    case '未训退队':
    case '超时退队':
    case '违规退队':
      return 'error'
    default:
      return 'default'
  }
}

// 编辑相关状态
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const editingId = ref<string | null>(null)
const formValue = ref<FormValue>({ ...defaultForm })

// 表单验证规则
const rules = {
  leaveRequest: {
    required: true,
    message: '请选择留队申请状态',
    trigger: ['blur', 'change']
  },
  status: {
    required: true,
    message: '请选择状态',
    trigger: ['blur', 'change']
  }
}

// 处理编辑
const handleEdit = (row: ExtendedMember) => {
  editingId.value = row.objectId
  formValue.value = {
    leaveRequest: row.leaveRequest || '未申请',
    status: row.status || '正常'
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
        const memberToUpdate = tableData.value.find(member => member.objectId === editingId.value)
        if (!memberToUpdate) {
          throw new Error('找不到要更新的成员')
        }

        const data = {
          ...memberToUpdate,
          leaveRequest: formValue.value.leaveRequest,
          status: formValue.value.status
        }
        
        await MemberService.updateMember(editingId.value!, data)
        
        // 重新加载数据
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
    width: 120,
    sorter: 'default'
  },
  {
    title: 'QQ号',
    key: 'qq',
    width: 120,
    sorter: (row1: any, row2: any) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '游戏ID',
    key: 'gameId',
    width: 120,
    sorter: 'default'
  },
  {
    title: '阶段',
    key: 'stage',
    width: 100,
    sorter: (row1: any, row2: any) => {
      const stageOrder = {
        '未新训': 0,
        '新训初期': 1,
        '新训1期': 2,
        '新训2期': 3,
        '新训3期': 4,
        '新训准考': 5,
        '紫夜': 6
      }
      return stageOrder[row1.stage] - stageOrder[row2.stage]
    },
    render(row: any) {
      const stageTypeMap = {
        '未新训': 'error',
        '新训初期': 'info',
        '新训1期': 'info',
        '新训2期': 'info',
        '新训3期': 'info',
        '新训准考': 'success',
        '紫夜': 'purple'
      }

      const stageStyleMap = {
        '紫夜': { color: '#7B1FA2', backgroundColor: '#EDE7F6' }
      }

      return h(
        NTag,
        {
          type: stageTypeMap[row.stage] as any,
          round: true,
          style: row.stage === '紫夜' ? stageStyleMap['紫夜'] : undefined
        },
        { default: () => row.stage }
      )
    }
  },
  {
    title: '请假状态',
    key: 'onLeave',
    width: 100,
    sorter: (row1: any, row2: any) => Number(row1.onLeave) - Number(row2.onLeave),
    render(row: any) {
      return h(
        NTag,
        {
          type: row.onLeave ? 'warning' : 'success',
          round: true
        },
        { default: () => row.onLeave ? '请假中' : '正常' }
      )
    }
  },
  {
    title: '留队申请',
    key: 'leaveRequest',
    width: 100,
    sorter: (row1: any, row2: any) => {
      const requestOrder = {
        '未申请': 0,
        '未通过': 1,
        '通过': 2
      }
      return requestOrder[row1.leaveRequest] - requestOrder[row2.leaveRequest]
    },
    render(row: any) {
      const typeMap = {
        '未申请': 'default',
        '未通过': 'error',
        '通过': 'success'
      }
      return h(
        NTag,
        {
          type: typeMap[row.leaveRequest],
          round: true
        },
        { default: () => row.leaveRequest }
      )
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    sorter: (row1: any, row2: any) => {
      const statusOrder = {
        '正常': 0,
        '异常': 1,
        '催促参训': 2,
        '未训退队': 3,
        '超时退队': 4,
        '违规退队': 5
      }
      return statusOrder[row1.status] - statusOrder[row2.status]
    },
    render(row: any) {
      return h(
        NTag,
        {
          type: getStatusType(row.status),
          round: true
        },
        { default: () => row.status }
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row: any) {
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
  // 保存到 localStorage
  localStorage.setItem('memberStatusPageSize', pageSize.toString())
  // 如果当前页超出了新的页数范围，则调整到最后一页
  const maxPage = Math.ceil(filteredData.value.length / pageSize)
  if (pagination.value.page > maxPage) {
    pagination.value.page = maxPage
  }
}

// 自动更新定时器
let updateTimer: number | null = null

// 定时更新数据
const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    tableData.value = await loadFromStorage()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时启动定时更新
onMounted(async () => {
  try {
    loading.value = true
    // 立即执行一次加载,确保状态同步
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