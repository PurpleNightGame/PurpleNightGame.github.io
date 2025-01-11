<template>
  <n-card>
    <template #header>
      <n-space align="center" justify="space-between">
        <n-h2 style="margin: 0; color: #7B1FA2">成员列表</n-h2>
        <n-button type="primary" @click="handleAddClick">
          添加成员
        </n-button>
      </n-space>
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
          v-model:value="statusFilter"
          placeholder="状态筛选"
          clearable
          :options="statusOptions"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="选择加入时间范围"
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

  <!-- 添加成员弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? '编辑成员' : '添加成员'"
    :style="{ width: '600px' }"
  >
    <n-form
      ref="formRef"
      :model="formValue"
      :rules="rules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="昵称" path="nickname">
        <n-input
          v-model:value="formValue.nickname"
          placeholder="请输入昵称"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="QQ号" path="qq">
        <n-input
          v-model:value="formValue.qq"
          placeholder="请输入QQ号"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="游戏ID" path="gameId">
        <n-input
          v-model:value="formValue.gameId"
          placeholder="请输入游戏ID（选填）"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="加入时间" path="joinTime">
        <n-date-picker
          v-model:value="formValue.joinTime"
          type="date"
          clearable
          :locale="zhCN.DatePicker"
          placeholder="请选择加入时间"
          :is-date-disabled="(timestamp) => timestamp > Date.now()"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="阶段" path="stage">
        <n-select
          v-model:value="formValue.stage"
          :options="stageOptions"
          placeholder="请选择阶段"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="状态" path="status">
        <n-select
          v-model:value="formValue.status"
          :options="statusOptions"
          placeholder="请选择状态"
          clearable
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

  <!-- 查看成员详情弹窗 -->
  <n-modal
    v-model:show="showDetailModal"
    preset="card"
    title="成员详情"
    :style="{ width: '800px' }"
  >
    <template v-if="selectedMember">
      <n-descriptions bordered>
        <n-descriptions-item label="昵称">
          {{ selectedMember.nickname }}
        </n-descriptions-item>
        <n-descriptions-item label="QQ号">
          {{ selectedMember.qq }}
        </n-descriptions-item>
        <n-descriptions-item label="游戏ID">
          {{ selectedMember.gameId || '未设置' }}
        </n-descriptions-item>
        <n-descriptions-item label="加入时间">
          {{ selectedMember.joinTime }}
        </n-descriptions-item>
        <n-descriptions-item label="阶段">
          <n-tag :type="getStageType(selectedMember.stage)" round :style="selectedMember.stage === '紫夜' ? { color: '#7B1FA2', backgroundColor: '#EDE7F6' } : undefined">
            {{ selectedMember.stage }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="getStatusType(selectedMember.status)" round>
            {{ selectedMember.status }}
          </n-tag>
        </n-descriptions-item>
      </n-descriptions>

      <!-- 请假记录 -->
      <div class="detail-section">
        <n-h3>请假记录</n-h3>
        <n-data-table
          :columns="leaveColumns"
          :data="memberLeaveRecords"
          :pagination="{ pageSize: 5 }"
        />
      </div>

      <!-- 违规记录 -->
      <div class="detail-section">
        <n-h3>违规记录</n-h3>
        <n-data-table
          :columns="blacklistColumns"
          :data="memberBlacklistRecords"
          :pagination="{ pageSize: 5 }"
        />
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { h, ref, reactive, watch, onMounted, onUnmounted, computed } from 'vue'
import { 
  NButton, 
  NSpace, 
  NTag, 
  NPopconfirm, 
  NForm, 
  NFormItem, 
  NInput, 
  NSelect, 
  NDatePicker, 
  NModal,
  NDescriptions,
  NDescriptionsItem,
  NH3,
  useMessage,
  NIcon,
  zhCN
} from 'naive-ui'
import { EyeOutline, CreateOutline, TrashOutline, SearchOutline } from '@vicons/ionicons5'
import { MemberService, BlacklistService, QuitService, BlacklistQuitService, LeaveService } from '../../../utils/leancloud-service'
import { calculateMemberStatus } from '../../../utils/memberStatus'

// 创建消息实例
const message = useMessage()

// 定义阶段和状态的类型
type Stage = '未新训' | '新训初期' | '新训1期' | '新训2期' | '新训3期' | '新训准考' | '紫夜'
type Status = '正常' | '异常' | '催促参训' | '未训退队' | '超时退队' | '违规退队'

// 定义表格数据类型
interface Member {
  id: string
  nickname: string
  qq: string
  gameId: string
  joinTime: string
  stage: Stage
  status: Status
  points?: number
  quit?: boolean
}

// 表格加载状态
const loading = ref(false)

// 本地存储键名
const STORAGE_KEY = 'training_members'

// 从本地存储加载数据的函数
const loadFromStorage = async (): Promise<Member[]> => {
  try {
    loading.value = true
    const [rawMembers, leaveRecords, blacklistRecords, quitRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords(),
      BlacklistService.getAllBlacklistRecords(),
      QuitService.getAllQuitRecords()
    ])
    
    // 创建退队记录映射
    const quitMemberIds = new Set(quitRecords.map(record => record.memberId))
    
    // 首先清理成员数据，移除所有 LeanCloud 保留字段
    const members = rawMembers.map(member => {
      const cleanMember = {
        objectId: member.objectId,
        nickname: member.nickname,
        qq: member.qq,
        gameId: member.gameId,
        joinTime: member.joinTime,
        stage: member.stage,
        status: member.status,
        lastTrainingDate: member.lastTrainingDate,
        onLeave: member.onLeave,
        leaveRequest: member.leaveRequest
      }
      return cleanMember
    })
    
    return await Promise.all(members.map(async member => {
      // 使用统一的状态计算函数
      const status = calculateMemberStatus(member, blacklistRecords, leaveRecords)

      // 检查是否有退队记录
      const hasQuitRecord = quitMemberIds.has(member.objectId)

      // 如果有退队记录，使用退队记录中的状态
      const finalStatus = hasQuitRecord ? 
        quitRecords.find(record => record.memberId === member.objectId)?.quitType || status : 
        status

      // 格式化加入时间
      let formattedJoinTime = member.joinTime
      try {
        if (member.joinTime) {
          const joinDate = new Date(member.joinTime)
          if (!isNaN(joinDate.getTime())) {
            formattedJoinTime = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`
          }
        }
      } catch (e) {
        console.error('Error formatting date:', e)
      }

      // 如果成员状态是退队状态但没有退队记录，添加退队记录
      if ((finalStatus === '未训退队' || finalStatus === '违规退队' || finalStatus === '超时退队') && !hasQuitRecord) {
        await QuitService.addQuitRecord({
          memberId: member.objectId,
          memberName: member.nickname,
          memberQQ: member.qq,
          quitDate: formatDate(new Date()),
          reason: finalStatus === '未训退队' ? '未参训' : 
                 finalStatus === '违规退队' ? '违规退队' : '超时退队',
          quitType: finalStatus
        })
      }

      return {
        id: member.objectId,
        nickname: member.nickname || '',
        qq: member.qq || '',
        gameId: member.gameId || '',
        joinTime: formattedJoinTime || '',
        stage: member.stage || '',
        status: finalStatus,
        lastTrainingDate: member.lastTrainingDate || '',
        onLeave: member.onLeave || false,
        leaveRequest: member.leaveRequest || '未申请'
      }
    }))
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 计算未训成员的状态
const calculateUntrainedMembers = () => {
  const members = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  return members
    .filter((member: Member) => member.stage === '未新训')
    .map((member: Member) => {
      const joinDate = new Date(member.joinTime)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysLeft = Math.max(0, 3 - diffDays)
      return {
        ...member,
        status: daysLeft > 0 ? '催促参训' : '未训退队'
      }
    })
}

// 保存数据到本地存储的函数
const saveToStorage = async (data: Member[]) => {
  try {
    loading.value = true
    for (const member of data) {
      if (member.id) {
        // 只包含需要更新的字段，排除保留字段
        const memberData = {
          nickname: member.nickname,
          qq: member.qq,
          gameId: member.gameId || '',
          joinTime: member.joinTime,
          stage: member.stage,
          status: member.status,
          onLeave: member.onLeave || false,
          leaveRequest: member.leaveRequest || '未申请',
          lastTrainingDate: member.lastTrainingDate
        }
        // 确保移除所有保留字段
        const { createdAt, updatedAt, objectId, ...cleanedData } = memberData as any
        await MemberService.updateMember(member.id, cleanedData)
      }
    }
  } catch (e) {
    console.error('Failed to save data:', e)
    message.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 修改表格数据的初始化
const tableData = ref<Member[]>([]) // 初始化为空数组

// 搜索和筛选状态
const searchText = ref('')
const stageFilter = ref(null)
const statusFilter = ref(null)
const dateRange = ref(null)

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

  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(member => member.status === statusFilter.value)
  }

  // 加入时间范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startDate = new Date(dateRange.value[0])
    const endDate = new Date(dateRange.value[1])
    const startTime = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const endTime = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    
    result = result.filter(member => {
      const joinDate = new Date(member.joinDate)
      const joinTime = Date.UTC(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate())
      return joinTime >= startTime && joinTime <= endTime
    })
  }

  return result
})

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: Number(localStorage.getItem('memberListPageSize')) || 10,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`,
  itemCount: 0
})

// 监听过滤后的数据长度来更新分页的总数
watch(
  () => filteredData.value.length,
  (newCount) => {
    pagination.value.itemCount = newCount
  },
  { immediate: true }
)

// 监听数据变化并保存到本地存储
watch(tableData, (newData) => {
  // 更新分页总数
  pagination.value.itemCount = newData.length
}, { deep: true })

// 添加日期格式化函数
const formatDate = (date: Date): string => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`
}

// 定义表格列
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
    sorter: (row1: Member, row2: Member) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '游戏ID',
    key: 'gameId',
    width: 120,
    sorter: 'default'
  },
  {
    title: '加入时间',
    key: 'joinTime',
    width: 120,
    sorter: (row1: Member, row2: Member) => new Date(row1.joinTime).getTime() - new Date(row2.joinTime).getTime()
  },
  {
    title: '阶段',
    key: 'stage',
    width: 100,
    sorter: (row1: Member, row2: Member) => {
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
    render(row: Member) {
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
    title: '状态',
    key: 'status',
    width: 100,
    render(row: Member) {
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
    width: 180,
    render(row: Member) {
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
                style: 'color: #18a058',
                onClick: () => handleView(row)
              },
              { icon: () => h(EyeOutline) }
            ),
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
                default: () => '确定删除该成员吗？'
              }
            )
          ]
        }
      )
    }
  }
]

// 处理页面变化
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 处理每页条数变化
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  // 保存到 localStorage
  localStorage.setItem('memberListPageSize', pageSize.toString())
  // 如果当前页超出了新的页数范围，则调整到最后一页
  const maxPage = Math.ceil(filteredData.value.length / pageSize)
  if (pagination.value.page > maxPage) {
    pagination.value.page = maxPage
  }
}

// 处理查看操作
const handleView = async (row: Member) => {
  selectedMember.value = row
  showDetailModal.value = true
  await loadMemberRecords(row)
}

// 处理编辑操作
const handleEdit = async (row: Member) => {
  editingId.value = row.id
  formValue.value = {
    nickname: row.nickname,
    qq: row.qq,
    gameId: row.gameId || '',
    joinTime: new Date(row.joinTime).getTime(),
    stage: row.stage,
    status: row.status
  }
  showModal.value = true
}

// 处理删除操作
const handleDelete = async (row: Member) => {
  try {
    loading.value = true
    await MemberService.deleteMember(row.id)
    tableData.value = await loadFromStorage()
    message.success('删除成功')
  } catch (e) {
    console.error('Failed to delete member:', e)
    message.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 添加成员表单类型
interface MemberForm {
  nickname: string
  qq: string
  gameId: string
  joinTime: number | null
  stage: Stage | null
  status: Status | null
}

// 表单默认值
const defaultForm: MemberForm = {
  nickname: '',
  qq: '',
  gameId: '',
  joinTime: null,
  stage: null,
  status: '正常'
}

// 表单状态
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const formValue = ref<MemberForm>({ ...defaultForm })

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
  { label: '催促新训', value: '催促新训' },
  { label: '催促参训', value: '催促参训' },
  { label: '未训退队', value: '未训退队' },
  { label: '超时退队', value: '超时退队' },
  { label: '违规退队', value: '违规退队' }
]

// 表单验证规则
const rules = {
  nickname: {
    required: true,
    message: '请输入昵称',
    trigger: ['blur', 'input']
  },
  qq: [
    {
      required: true,
      message: '请输入QQ号',
      trigger: ['blur', 'input']
    },
    {
      pattern: /^\d{5,11}$/,
      message: '请输入正确的QQ号',
      trigger: ['blur', 'input']
    }
  ],
  joinTime: {
    required: true,
    type: 'number',
    message: '请选择加入时间',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      if (!value) return false
      const date = new Date(value)
      return date <= new Date()
    }
  },
  stage: {
    required: true,
    message: '请选择阶段',
    trigger: ['blur', 'change']
  },
  status: {
    required: true,
    message: '请选择状态',
    trigger: ['blur', 'change']
  }
}

// 添加编辑模式标记
const isEdit = ref(false)
const editingId = ref<string | null>(null)

// 修改表单提交处理
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 根据阶段确定初始状态
    const determineStatus = (stage: string | null, currentStatus: string | null = null) => {
      if (stage === '未新训') {
        return '催促参训'
      }
      if (stage === '紫夜') {
        return '正常'
      }
      // 编辑模式下保持当前状态，除非是未新训
      return currentStatus || '正常'
    }

    if (editingId.value) {
      // 编辑模式
      const memberData = {
        nickname: formValue.value.nickname,
        qq: formValue.value.qq,
        gameId: formValue.value.gameId || '',
        joinTime: new Date(formValue.value.joinTime!).toLocaleDateString('zh-CN').replace(/\//g, '-'),
        stage: formValue.value.stage,
        status: determineStatus(formValue.value.stage, formValue.value.status),
        onLeave: false,
        leaveRequest: '未申请'
      }
      await MemberService.updateMember(editingId.value, memberData)
    } else {
      // 添加模式
      const newMember = {
        nickname: formValue.value.nickname,
        qq: formValue.value.qq,
        gameId: formValue.value.gameId || '',
        joinTime: new Date(formValue.value.joinTime!).toLocaleDateString('zh-CN').replace(/\//g, '-'),
        stage: formValue.value.stage!,
        status: determineStatus(formValue.value.stage),
        onLeave: false,
        leaveRequest: '未申请'
      }
      await MemberService.addMember(newMember)
    }

    // 重新加载数据以获取更新后的状态
    tableData.value = await loadFromStorage()
    showModal.value = false
    formValue.value = { ...defaultForm }
    message.success(editingId.value ? '更新成功' : '添加成功')
  } catch (e) {
    console.error('Failed to submit:', e)
    message.error(editingId.value ? '更新失败' : '添加失败')
  } finally {
    loading.value = false
  }
}

// 添加自动更新功能
let updateTimer: number | null = null

const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    try {
      const newData = await loadFromStorage()
      tableData.value = newData
    } catch (e) {
      console.error('Failed to auto update data:', e)
    }
  }, 60000) // 每分钟更新一次
}

// 组件挂载时加载数据
onMounted(async () => {
  try {
    loading.value = true
    tableData.value = await loadFromStorage()
    startAutoUpdate() // 启动自动更新
  } catch (e) {
    console.error('Failed to load initial data:', e)
    message.error('初始数据加载失败')
  } finally {
    loading.value = false
  }
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})

// 查看详情相关
const showDetailModal = ref(false)
const selectedMember = ref<Member | null>(null)

// 加载成员相关记录
const memberLeaveRecords = ref([])
const memberBlacklistRecords = ref([])

const loadMemberRecords = async (member: Member) => {
  try {
    // 从 LeanCloud 加载请假记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    memberLeaveRecords.value = leaveRecords
      .filter((record: any) => record.memberId === member.id)
      .map((record: any) => {
        // 格式化日期
        let formattedStartDate = record.startDate
        let formattedEndDate = record.endDate
        try {
          if (record.startDate) {
            const startDate = new Date(record.startDate)
            if (!isNaN(startDate.getTime())) {
              formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
            }
          }
          if (record.endDate) {
            const endDate = new Date(record.endDate)
            if (!isNaN(endDate.getTime())) {
              formattedEndDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
            }
          }
        } catch (e) {
          console.error('Error formatting dates:', e)
        }

        // 只返回需要的字段
        return {
          id: record.objectId,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          reason: record.reason || '',
          status: record.status || '请假中'
        }
      })

    // 从 LeanCloud 加载违规记录
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    memberBlacklistRecords.value = blacklistRecords
      .filter((record: any) => record.memberId === member.id)
      .map((record: any) => {
        // 格式化日期
        let formattedRecordDate = record.recordDate
        try {
          if (record.recordDate) {
            const recordDate = new Date(record.recordDate)
            if (!isNaN(recordDate.getTime())) {
              formattedRecordDate = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`
            }
          }
        } catch (e) {
          console.error('Error formatting record date:', e)
        }

        // 只返回需要的字段
        return {
          id: record.objectId,
          recordDate: formattedRecordDate,
          level: record.level || '警告',
          reason: record.reason || '',
          points: record.points || 1,
          status: record.status || '有效'
        }
      })

    // 更新成员状态
    if (selectedMember.value) {
      const currentStatus = calculateMemberStatus(member, blacklistRecords, leaveRecords)
      selectedMember.value = {
        ...selectedMember.value,
        status: currentStatus
      }
    }
  } catch (e) {
    console.error('Failed to load member records:', e)
    message.error('加载记录失败')
  }
}

// 请假记录表格列配置
const leaveColumns = [
  {
    title: '起始日期',
    key: 'startDate',
    width: 130,
    sorter: (row1: any, row2: any) => new Date(row1.startDate).getTime() - new Date(row2.startDate).getTime()
  },
  {
    title: '结束日期',
    key: 'endDate',
    width: 130,
    sorter: (row1: any, row2: any) => new Date(row1.endDate).getTime() - new Date(row2.endDate).getTime()
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
    render(row: any) {
      const typeMap = {
        '请假中': 'warning',
        '等待销假': 'info',
        '已结束': 'success'
      }
      return h(
        NTag,
        {
          type: typeMap[row.status],
          round: true
        },
        { default: () => row.status }
      )
    }
  }
]

// 违规记录表格列配置
const blacklistColumns = [
  {
    title: '记录日期',
    key: 'recordDate',
    width: 130,
    sorter: (row1: any, row2: any) => new Date(row1.recordDate).getTime() - new Date(row2.recordDate).getTime()
  },
  {
    title: '等级',
    key: 'level',
    width: 100,
    render(row: any) {
      return h(
        NTag,
        {
          type: row.level === '严重警告' ? 'error' : 'warning',
          round: true
        },
        { default: () => row.level }
      )
    }
  },
  {
    title: '原因',
    key: 'reason',
    width: 200
  },
  {
    title: '黑点数',
    key: 'points',
    width: 80,
    render(row: any) {
      return h(
        NTag,
        {
          type: 'default',
          round: true
        },
        { default: () => row.points || 1 }
      )
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render(row: any) {
      return h(
        NTag,
        {
          type: row.status === '有效' ? 'success' : 'error',
          round: true
        },
        { default: () => row.status || '有效' }
      )
    }
  }
]

// 获取状态标签类型
const getStatusType = (status: string) => {
  switch (status) {
    case '正常':
      return 'success'
    case '异常':
      return 'error'
    case '催促新训':
    case '催促参训':
      return 'warning'
    case '未训退队':
    case '超时退队':
    case '违规退队':
      return 'error'
    default:
      return 'default'
  }
}

// 获取阶段标签类型
const getStageType = (stage: string) => {
  const stageTypeMap = {
    '未新训': 'error',
    '新训初期': 'info',
    '新训1期': 'info',
    '新训2期': 'info',
    '新训3期': 'info',
    '新训准考': 'success',
    '紫夜': 'purple'
  }
  return stageTypeMap[stage] || 'default'
}

// 处理添加按钮点击
const handleAddClick = () => {
  isEdit.value = false
  editingId.value = null
  formValue.value = { ...defaultForm }
  showModal.value = true
}
</script>

<style scoped>
:deep(.n-button:not(.submit-button)) {
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

:deep(.n-card-header .n-button) {
  background-color: #7B1FA2 !important;
  color: white !important;
}

:deep(.n-tag--purple) {
  background-color: #EDE7F6;
  color: #7B1FA2;
  border: 1px solid #7B1FA2;
}

:deep(.n-data-table-base-table) {
  overflow-x: auto;
}

/* 添加表单相关样式 */
:deep(.n-modal-body) {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 18px;
}

.detail-section {
  margin-top: 24px;
}

:deep(.n-descriptions) {
  margin-bottom: 24px;
}

:deep(.n-descriptions .n-descriptions-table-header) {
  background-color: #f5f5f5;
}

:deep(.n-tag) {
  min-width: 64px;
  justify-content: center;
}
</style> 