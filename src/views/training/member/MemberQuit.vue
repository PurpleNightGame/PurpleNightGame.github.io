<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">退队审批</n-h2>
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
          v-model:value="reasonFilter"
          placeholder="退队原因"
          clearable
          :options="[
            { label: '超时退队', value: '超时退队' },
            { label: '未训退队', value: '未训退队' },
            { label: '违规退队', value: '违规退队' }
          ]"
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
  NButtonGroup, 
  useDialog,
  NInput,
  NSelect,
  NIcon
} from 'naive-ui'
import { CheckmarkCircleOutline, CloseCircleOutline, SearchOutline } from '@vicons/ionicons5'
import { MemberService, QuitService, BlacklistService, LeaveService } from '../../../utils/leancloud-service'
import { calculateMemberStatus } from '../../../utils/memberStatus'

// 创建消息实例
const message = useMessage()
// 创建对话框实例
const dialog = useDialog()

// 定义退队成员类型
interface QuitMember extends Member {
  objectId?: string
  quitReason: '超时退队' | '未训退队' | '违规退队'
  quitRecordId?: string
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载退队成员
const loadQuitMembers = async (): Promise<QuitMember[]> => {
  try {
    loading.value = true
    const quitRecords = await QuitService.getAllQuitRecords()
    const members = await MemberService.getAllMembers()
    
    // 使用Map来存储每个成员的最新退队记录
    const memberQuitMap = new Map()
    
    // 按创建时间降序排序退队记录
    quitRecords.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    
    // 只保留每个成员的最新退队记录
    quitRecords.forEach(record => {
      if (!memberQuitMap.has(record.memberId)) {
        memberQuitMap.set(record.memberId, record)
      }
    })
    
    // 转换为数组并添加成员信息
    return Array.from(memberQuitMap.values())
      .map(record => {
        const member = members.find(m => m.objectId === record.memberId)
        if (!member) return null
        
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
        
        return {
          ...member,
          id: member.objectId,
          joinTime: formattedJoinTime,
          quitReason: record.quitType,
          quitRecordId: record.objectId
        }
      })
      .filter(Boolean) as QuitMember[]
  } catch (e) {
    console.error('Failed to load quit members:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 表格数据
const tableData = ref<QuitMember[]>([])

// 搜索和筛选状态
const searchText = ref('')
const reasonFilter = ref(null)

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

  // 退队原因过滤
  if (reasonFilter.value) {
    result = result.filter(member => member.quitReason === reasonFilter.value)
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

// 处理最终确认退队
const handleFinalConfirmQuit = async (row: QuitMember) => {
  try {
    loading.value = true
    
    // 删除成员记录
    await MemberService.deleteMember(row.id)
    
    // 删除相关的黑点记录
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    for (const record of blacklistRecords) {
      if (record.memberId === row.id) {
        await BlacklistService.deleteBlacklistRecord(record.objectId)
      }
    }
    
    // 删除相关的请假记录
    const leaveRecords = await LeaveService.getAllLeaveRecords()
    for (const record of leaveRecords) {
      if (record.memberId === row.id) {
        await LeaveService.deleteLeaveRecord(record.objectId)
      }
    }
    
    // 更新表格数据
    tableData.value = await loadQuitMembers()
    message.success('成员退队处理完成')
  } catch (e) {
    console.error('Failed to process quit:', e)
    message.error('处理失败，请重试')
  } finally {
    loading.value = false
  }
}

// 处理确认退队
const handleConfirmQuit = async (row: QuitMember) => {
  try {
    // 获取成员当前状态
    const [members, leaveRecords, blacklistRecords] = await Promise.all([
      MemberService.getAllMembers(),
      LeaveService.getAllLeaveRecords(),
      BlacklistService.getAllBlacklistRecords()
    ])
    
    const member = members.find(m => m.objectId === row.id)
    if (!member) {
      message.error('未找到该成员')
      return
    }

    // 计算成员当前状态
    const currentStatus = calculateMemberStatus(member, blacklistRecords, leaveRecords)
    
    // 检查是否为退队状态
    const quitStatuses = ['未训退队', '超时退队', '违规退队']
    if (!quitStatuses.includes(currentStatus)) {
      dialog.warning({
        title: '警告',
        content: `该成员当前状态为"${currentStatus}"，不符合退队条件，确定要执行退队操作吗？`,
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
          handleFinalConfirmQuit(row)
        }
      })
      return
    }

    // 如果是退队状态，直接执行退队操作
    await handleFinalConfirmQuit(row)
  } catch (e) {
    console.error('Failed to confirm quit:', e)
    message.error('操作失败，请重试')
  }
}

// 处理取消退队
const handleCancelQuit = async (row: QuitMember) => {
  try {
    loading.value = true
    
    // 删除退队记录
    if (row.quitRecordId) {
      await QuitService.deleteQuitRecord(row.quitRecordId)
    }
    
    // 更新成员状态
    if (row.id) {
      // 格式化日期
      let formattedJoinTime = row.joinTime
      try {
        if (row.joinTime) {
          const joinDate = new Date(row.joinTime)
          if (!isNaN(joinDate.getTime())) {
            formattedJoinTime = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}-${String(joinDate.getDate()).padStart(2, '0')}`
          }
        }
      } catch (e) {
        console.error('Error formatting date:', e)
      }

      const memberData = {
        nickname: row.nickname,
        qq: row.qq,
        gameId: row.gameId || '',
        joinTime: formattedJoinTime,
        stage: row.stage,
        status: '正常'
      }
      await MemberService.updateMember(row.id, memberData)
    }
    
    // 重新加载数据
    tableData.value = await loadQuitMembers()
    message.success('已取消退队申请')
  } catch (e) {
    console.error('Failed to cancel quit:', e)
    message.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}

// 获取退队原因标签类型
const getQuitReasonType = (reason: string) => {
  // 所有退队类型都返回error，显示红色标签
  return 'error'
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
    sorter: (row1: QuitMember, row2: QuitMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '游戏ID',
    key: 'gameId',
    width: 130,
    sorter: 'default'
  },
  {
    title: '退队原因',
    key: 'quitReason',
    render: (row: QuitMember) => {
      return h(NTag, {
        type: getQuitReasonType(row.quitReason),
        round: true
      }, {
        default: () => row.quitReason
      })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row: QuitMember) {
      return h(NSpace, { align: 'center' }, {
        default: () => [
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleConfirmQuit(row)
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
                { icon: () => h(CheckmarkCircleOutline) }
              ),
              default: () => '确定将该成员退队吗？'
            }
          ),
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleCancelQuit(row)
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
                { icon: () => h(CloseCircleOutline) }
              ),
              default: () => '确定取消退队申请吗？'
            }
          )
        ]
      })
    }
  }
]

// 添加自动更新功能
let updateTimer: number | null = null

const startAutoUpdate = () => {
  updateTimer = window.setInterval(async () => {
    tableData.value = await loadQuitMembers()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时启动定时更新
onMounted(async () => {
  try {
    loading.value = true
    // 立即执行一次加载，确保状态同步
    tableData.value = await loadQuitMembers()
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
:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}
</style> 