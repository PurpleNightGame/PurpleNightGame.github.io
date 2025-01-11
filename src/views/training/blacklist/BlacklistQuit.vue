<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">违规退队</n-h2>
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
        <n-input-number
          v-model:value="minBlacklistCount"
          placeholder="最小黑点数"
          clearable
          :min="0"
          style="width: 120px"
        />
        <n-input-number
          v-model:value="maxBlacklistCount"
          placeholder="最大黑点数"
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
import { CreateOutline, TrashOutline, SearchOutline, CloseCircleOutline } from '@vicons/ionicons5'
import { BlacklistQuitService, MemberService, BlacklistService, QuitService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 定义自动更新定时器
let updateTimer: number | null = null

// 定义违规退队记录接口
interface BlacklistQuitRecord {
  id: string
  memberId: string
  memberName: string
  memberQQ: string
  blacklistCount: number
  status: string
}

// 表格加载状态
const loading = ref(false)

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40]
})

// 处理分页变化
const handlePageChange = (page: number) => {
  pagination.value.page = page
}

// 搜索和筛选状态
const searchText = ref('')
const minBlacklistCount = ref<number | null>(null)
const maxBlacklistCount = ref<number | null>(null)
const dateRange = ref(null)

// 处理违规退队
const handleConfirmQuit = async (row: any) => {
  try {
    loading.value = true
    
    // 更新成员状态为违规退队
    const member = await MemberService.getMember(row.memberId)
    if (!member) {
      throw new Error('找不到该成员')
    }

    // 检查是否已存在退队记录
    const quitRecords = await QuitService.getAllQuitRecords()
    const hasQuitRecord = quitRecords.some(record => record.memberId === row.memberId)

    // 如果已存在退队记录，显示提示并返回
    if (hasQuitRecord) {
      message.warning('该成员已有退队记录')
      return
    }

    // 添加退队记录
    await QuitService.addQuitRecord({
      memberId: row.memberId,
      memberName: row.memberName,
      memberQQ: row.memberQQ,
      quitDate: new Date().toISOString().split('T')[0],
      reason: '黑点数达到4个',
      type: '违规退队',
      quitType: '违规退队'
    })

    // 然后更新成员状态
    await MemberService.updateMember(row.memberId, {
      ...member,
      status: '违规退队'
    })
    
    // 立即更新表格数据
    await updateTableData()
    
    message.success('已确认违规退队')
  } catch (e) {
    console.error('Failed to process quit:', e)
    message.error('处理失败')
  } finally {
    loading.value = false
  }
}

// 表格列定义
const columns = [
  {
    title: '成员昵称',
    key: 'memberName',
    sorter: (row1: BlacklistQuitRecord, row2: BlacklistQuitRecord) => 
      row1.memberName.localeCompare(row2.memberName)
  },
  {
    title: 'QQ号',
    key: 'memberQQ',
    sorter: (row1: BlacklistQuitRecord, row2: BlacklistQuitRecord) => 
      Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '黑点数量',
    key: 'blacklistCount',
    sorter: (row1: BlacklistQuitRecord, row2: BlacklistQuitRecord) => 
      row1.blacklistCount - row2.blacklistCount
  },
  {
    title: '状态',
    key: 'status',
    render: (row: BlacklistQuitRecord) => {
      return h(NTag, {
        type: 'error',
        round: true
      }, {
        default: () => row.status
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row: any) => {
      return h(NSpace, { justify: 'start', align: 'center', size: 'small' }, {
        default: () => [
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleConfirmQuit(row)
            },
            {
              default: () => '确认将该成员移至退队名单？',
              trigger: () => h(
                NButton,
                {
                  quaternary: true,
                  circle: true,
                  size: 'small',
                  style: 'color: #d03050',
                },
                { icon: () => h(CloseCircleOutline) }
              )
            }
          )
        ]
      })
    }
  }
]

// 从数据库加载数据
const loadFromStorage = async (): Promise<BlacklistQuitRecord[]> => {
  try {
    loading.value = true
    const [members, blacklistRecords, quitRecords] = await Promise.all([
      MemberService.getAllMembers(),
      BlacklistService.getAllBlacklistRecords(),
      QuitService.getAllQuitRecords()
    ])
    
    // 计算每个成员的黑点数
    const memberBlacklistCounts = new Map()
    blacklistRecords.forEach(record => {
      // 只计算有效的黑点记录
      if (record.status !== '已失效') {
        const count = memberBlacklistCounts.get(record.memberId) || 0
        const points = record.points || 1
        memberBlacklistCounts.set(record.memberId, count + points)
      }
    })
    
    // 获取已经处理过退队的成员ID列表
    const quitMemberIds = new Set(quitRecords.map(record => record.memberId))
    
    // 筛选出黑点数大于等于4且未退队的成员
    const result = []
    for (const [memberId, blacklistCount] of memberBlacklistCounts.entries()) {
      // 如果成员已经退队，跳过
      if (quitMemberIds.has(memberId)) {
        continue
      }
      
      // 如果黑点数大于等于4，添加到结果中
      if (blacklistCount >= 4) {
        const member = members.find(m => m.objectId === memberId)
        if (member) {
          // 如果成员已经是违规退队状态，跳过
          if (member.status === '违规退队') {
            continue
          }
          
          // 如果成员状态是违规退队但没有退队记录，添加退队记录
          if (member.status === '违规退队' && !quitMemberIds.has(memberId)) {
            await QuitService.addQuitRecord({
              memberId: member.objectId,
              memberName: member.nickname,
              memberQQ: member.qq,
              quitDate: new Date().toISOString().split('T')[0],
              reason: '黑点数达到4个',
              type: '违规退队',
              quitType: '违规退队'
            })
            continue
          }
          
          result.push({
            id: member.objectId,
            memberId: member.objectId,
            memberName: member.nickname,
            memberQQ: member.qq,
            blacklistCount: blacklistCount,
            status: '待处理'
          })
        }
      }
    }
    
    return result
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 修改表格数据的初始化和更新
const tableData = ref<BlacklistQuitRecord[]>([])

// 添加过滤后的数据计算属性
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

  // 黑点数范围过滤
  if (minBlacklistCount.value !== null) {
    result = result.filter(record => record.blacklistCount >= minBlacklistCount.value!)
  }
  if (maxBlacklistCount.value !== null) {
    result = result.filter(record => record.blacklistCount <= maxBlacklistCount.value!)
  }

  return result
})

// 添加一个立即更新数据的函数
const updateTableData = async () => {
  try {
    const data = await loadFromStorage()
    tableData.value = data
    // 更新分页配置
    pagination.value.itemCount = data.length
  } catch (e) {
    console.error('Failed to update table data:', e)
    message.error('更新数据失败')
  }
}

// 修改自动更新逻辑
const startAutoUpdate = () => {
  updateTimer = window.setInterval(updateTableData, 60000) // 每分钟更新一次
}

// 修改组件挂载时的初始化
onMounted(async () => {
  await loadMemberOptions()
  await updateTableData()
  startAutoUpdate()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})

// 修改处理添加的函数
const handleAdd = () => {
  isEdit.value = false
  editingId.value = null
  formValue.value = {
    memberId: null,
    quitDate: null,
    reason: '',
    recorder: ''
  }
  showModal.value = true
}

// 修改处理编辑的函数
const handleEdit = (row: BlacklistQuitRecord) => {
  isEdit.value = true
  editingId.value = row.id
  const [year, month, day] = row.quitDate.split('-').map(Number)
  
  formValue.value = {
    memberId: row.memberId,
    quitDate: new Date(year, month - 1, day).getTime(),
    reason: row.reason,
    recorder: row.recorder
  }
  showModal.value = true
}

// 修改处理删除的函数
const handleDelete = async (row: BlacklistQuitRecord) => {
  try {
    loading.value = true
    await BlacklistQuitService.deleteBlacklistQuitRecord(row.id)
    
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
    
    const date = new Date(formValue.value.quitDate!)
    
    const recordData = {
      memberId: formValue.value.memberId!,
      quitDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      reason: formValue.value.reason,
      recorder: formValue.value.recorder
    }
    
    if (isEdit.value && editingId.value) {
      // 更新记录
      await BlacklistQuitService.updateBlacklistQuitRecord(editingId.value, recordData)
    } else {
      // 添加新记录
      await BlacklistQuitService.addBlacklistQuitRecord(recordData)
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
</script>

<style scoped>
:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}
</style> 