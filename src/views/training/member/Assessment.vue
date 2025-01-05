<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">考核管理</n-h2>
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
          v-model:value="mapFilter"
          placeholder="考核地图"
          clearable
          :options="mapOptions"
          style="width: 120px"
        />
        <n-select
          v-model:value="statusFilter"
          placeholder="考核状态"
          clearable
          :options="statusOptions"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择通过日期范围"
          style="width: 250px"
        />
        <n-input-number
          v-model:value="minScore"
          placeholder="最低分数"
          clearable
          :min="0"
          :max="100"
          style="width: 120px"
        />
        <n-input-number
          v-model:value="maxScore"
          placeholder="最高分数"
          clearable
          :min="0"
          :max="100"
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

  <!-- 编辑考核信息弹窗 -->
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="编辑考核信息"
    :style="{ width: '600px' }"
  >
    <n-form
      ref="formRef"
      :model="formValue"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="考核地图" path="assessmentMap">
        <n-select
          v-model:value="formValue.assessmentMap"
          :options="mapOptions"
          placeholder="请选择考核地图"
        />
      </n-form-item>
      
      <n-form-item label="考核状态" path="assessmentStatus">
        <n-select
          v-model:value="formValue.assessmentStatus"
          :options="statusOptions"
          placeholder="请选择考核状态"
        />
      </n-form-item>

      <n-form-item label="通过日期" path="passDate">
        <n-date-picker
          v-model:value="formValue.passDate"
          type="date"
          clearable
          :is-date-disabled="(timestamp) => timestamp > Date.now()"
          style="width: 100%"
        />
      </n-form-item>

      <n-form-item label="考核评分" path="score">
        <n-input-number
          v-model:value="formValue.score"
          :min="0"
          :max="100"
          placeholder="请输入评分(0-100)"
        />
      </n-form-item>

      <n-form-item label="考核评价" path="comment">
        <n-input
          v-model:value="formValue.comment"
          type="textarea"
          placeholder="请输入考核评价"
          :autosize="{ minRows: 3, maxRows: 5 }"
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
  NForm, 
  NFormItem, 
  NSelect, 
  NDatePicker,
  NInputNumber,
  NInput,
  NModal,
  useMessage,
  NIcon
} from 'naive-ui'
import { CreateOutline, SearchOutline } from '@vicons/ionicons5'
import { MemberService, AssessmentService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 扩展 Member 类型
interface AssessmentMember extends Member {
  objectId?: string
  assessmentMap?: string
  assessmentStatus?: '通过' | '未通过'
  passDate?: string
  score?: number
  comment?: string
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<AssessmentMember[]> => {
  try {
    loading.value = true
    const members = await MemberService.getAllMembers()
    const assessments = await AssessmentService.getAllAssessments()
    
    return members.map((member: any) => {
      const assessment = assessments.find((a: any) => a.memberId === member.objectId)
      return {
        ...member,
        id: member.objectId,
        assessmentMap: assessment?.assessmentMap || '',
        assessmentStatus: assessment?.assessmentStatus || '未通过',
        passDate: assessment?.passDate || '',
        score: assessment?.score || 0,
        comment: assessment?.comment || ''
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

// 保存数据到数据库
const saveToStorage = async (member: AssessmentMember) => {
  try {
    const assessmentData = {
      memberId: member.id || member.objectId,
      assessmentMap: member.assessmentMap,
      assessmentStatus: member.assessmentStatus,
      passDate: member.passDate,
      score: member.score,
      comment: member.comment
    }

    // 检查是否已存在考核记录
    const assessments = await AssessmentService.getAllAssessments()
    const existingAssessment = assessments.find((a: any) => 
      a.memberId === (member.id || member.objectId) && 
      a.assessmentMap === member.assessmentMap
    )

    if (existingAssessment) {
      await AssessmentService.updateAssessment(existingAssessment.objectId, assessmentData)
    } else {
      await AssessmentService.addAssessment(assessmentData)
    }

    // 更新成员信息
    const { id, objectId, ...memberData } = member
    const updateData: any = {
      ...memberData
    }

    // 如果考核状态为通过，更新成员阶段为紫夜并设置通过日期
    if (member.assessmentStatus === '通过') {
      updateData.stage = '紫夜'
      updateData.passDate = member.passDate
    }

    await MemberService.updateMember(id || objectId!, updateData)
  } catch (e) {
    console.error('Failed to save data:', e)
    message.error('保存数据失败')
    throw e
  }
}

// 表格数据
const tableData = ref<AssessmentMember[]>([])

// 搜索和筛选状态
const searchText = ref('')
const mapFilter = ref(null)
const statusFilter = ref(null)
const dateRange = ref(null)
const minScore = ref<number | null>(null)
const maxScore = ref<number | null>(null)

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

  // 考核地图过滤
  if (mapFilter.value) {
    result = result.filter(member => member.assessmentMap === mapFilter.value)
  }

  // 考核状态过滤
  if (statusFilter.value) {
    result = result.filter(member => member.assessmentStatus === statusFilter.value)
  }

  // 通过日期范围过滤
  if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
    const startTime = new Date(dateRange.value[0]).getTime()
    const endTime = new Date(dateRange.value[1]).getTime()
    result = result.filter(member => {
      if (!member.passDate) return false
      const passTime = new Date(member.passDate).getTime()
      return passTime >= startTime && passTime <= endTime
    })
  }

  // 分数范围过滤
  if (minScore.value !== null) {
    result = result.filter(member => (member.score || 0) >= minScore.value!)
  }
  if (maxScore.value !== null) {
    result = result.filter(member => (member.score || 0) <= maxScore.value!)
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

// 考核地图选项
const mapOptions = [
  { label: '加油站', value: '加油站' },
  { label: '蜘蛛', value: '蜘蛛' },
  { label: '213公寓', value: '213公寓' },
  { label: '海滨公寓', value: '海滨公寓' },
  { label: '大学', value: '大学' },
  { label: '医院', value: '医院' }
]

// 考核状态选项
const statusOptions = [
  { label: '通过', value: '通过' },
  { label: '未通过', value: '未通过' }
]

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
    sorter: (row1: AssessmentMember, row2: AssessmentMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '考核地图',
    key: 'assessmentMap',
    width: 110,
    sorter: 'default'
  },
  {
    title: '考核状态',
    key: 'assessmentStatus',
    width: 110,
    sorter: (row1: AssessmentMember, row2: AssessmentMember) => {
      const statusOrder = {
        '未通过': 0,
        '通过': 1
      }
      return statusOrder[row1.assessmentStatus || '未通过'] - statusOrder[row2.assessmentStatus || '未通过']
    },
    render(row: AssessmentMember) {
      return h(
        NTag,
        {
          type: row.assessmentStatus === '通过' ? 'success' : 'error',
          round: true
        },
        { default: () => row.assessmentStatus || '未通过' }
      )
    }
  },
  {
    title: '通过日期',
    key: 'passDate',
    width: 130,
    sorter: (row1: AssessmentMember, row2: AssessmentMember) => {
      if (!row1.passDate && !row2.passDate) return 0
      if (!row1.passDate) return 1
      if (!row2.passDate) return -1
      return new Date(row1.passDate).getTime() - new Date(row2.passDate).getTime()
    }
  },
  {
    title: '考核评分',
    key: 'score',
    width: 100,
    sorter: (row1: AssessmentMember, row2: AssessmentMember) => (row1.score || 0) - (row2.score || 0),
    render(row: AssessmentMember) {
      if (!row.score) return '未评分'
      const color = row.score >= 90 ? '#18a058' : 
                   row.score >= 60 ? '#2080f0' : '#d03050'
      return h('span', { style: { color } }, row.score)
    }
  },
  {
    title: '考核评价',
    key: 'comment',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 70,
    align: 'left',
    titleAlign: 'left',
    fixed: 'right',
    render(row: AssessmentMember) {
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

// 编辑表单相关
const showModal = ref(false)
const formRef = ref<typeof NForm | null>(null)
const editingId = ref<number | null>(null)
const formValue = ref({
  assessmentMap: '',
  assessmentStatus: '',
  passDate: null as number | null,
  score: 0,
  comment: ''
})

// 表单验证规则
const rules = {
  assessmentMap: {
    required: true,
    message: '请选择考核地图',
    trigger: ['blur', 'change']
  },
  assessmentStatus: {
    required: true,
    message: '请选择考核状态',
    trigger: ['blur', 'change']
  },
  passDate: {
    required: true,
    type: 'number',
    message: '请选择通过日期',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      if (!value) return false
      const date = new Date(value)
      return date <= new Date()
    }
  },
  score: {
    type: 'number',
    message: '请输入有效的评分',
    trigger: ['blur', 'change'],
    validator: (rule: any, value: number) => {
      if (value === null || value === undefined) return true
      return value >= 0 && value <= 100
    }
  }
}

// 处理编辑
const handleEdit = (row: AssessmentMember) => {
  editingId.value = row.id
  const passDate = row.passDate ? new Date(row.passDate).getTime() : null

  formValue.value = {
    assessmentMap: row.assessmentMap || '',
    assessmentStatus: row.assessmentStatus || '未通过',
    passDate,
    score: row.score || 0,
    comment: row.comment || ''
  }
  showModal.value = true
}

// 处理提交
const handleSubmit = async (e: MouseEvent) => {
  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      const date = formValue.value.passDate
        ? new Date(formValue.value.passDate)
        : null
      const passDate = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : ''

      const index = tableData.value.findIndex(item => item.id === editingId.value)
      if (index > -1) {
        try {
          loading.value = true

          // 更新成员数据
          const updatedMember = {
            ...tableData.value[index],
            assessmentMap: formValue.value.assessmentMap,
            assessmentStatus: formValue.value.assessmentStatus,
            passDate,
            score: formValue.value.score,
            comment: formValue.value.comment
          }

          // 保存到数据库
          await saveToStorage(updatedMember)
          
          // 更新本地数据
          tableData.value[index] = updatedMember
          
          message.success('更新成功')
          showModal.value = false
        } catch (e) {
          console.error('Failed to update assessment:', e)
          message.error('更新失败')
        } finally {
          loading.value = false
        }
      }
    }
  })
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

:deep(.n-input-number .n-input-number-input) {
  text-align: left;
}
</style> 