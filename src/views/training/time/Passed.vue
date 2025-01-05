<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">通过名单</n-h2>
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
          v-model:value="teachingStatusFilter"
          placeholder="授课状态"
          clearable
          :options="[
            { label: '允许授课', value: '允许授课' },
            { label: '观察期', value: '观察期' }
          ]"
          style="width: 120px"
        />
        <n-date-picker
          v-model:value="passDateRange"
          type="daterange"
          clearable
          placeholder="通过日期范围"
          style="width: 240px"
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
  NTag, 
  NSpace, 
  NInput, 
  NSelect, 
  NDatePicker,
  NIcon,
  useMessage
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { MemberService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()

// 扩展 Member 类型
interface PassedMember extends Member {
  objectId?: string
  passDate: string
  teachingStatus: '观察期' | '允许授课'
}

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async (): Promise<PassedMember[]> => {
  try {
    loading.value = true
    const members = await MemberService.getAllMembers()
    return members
      .filter((member: any) => member.passDate) // 只处理有通过日期的成员
      .map((member: any) => {
        const passDate = new Date(member.passDate)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - passDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          ...member,
          id: member.objectId,
          teachingStatus: diffDays >= 30 ? '允许授课' : '观察期'
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
const tableData = ref<PassedMember[]>([])

// 计算需要显示的数据
const passedData = computed(() => {
  return tableData.value.map(member => ({
    ...member,
    teachingStatus: calculateTeachingStatus(member.passDate)
  }))
})

// 计算授课状态
const calculateTeachingStatus = (passDate: string) => {
  const date = new Date(passDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 30 ? '允许授课' : '观察期'
}

// 搜索和筛选状态
const searchText = ref('')
const teachingStatusFilter = ref(null)
const passDateRange = ref(null)

// 修改表格数据的计算属性
const filteredData = computed(() => {
  let result = passedData.value

  // 搜索文本过滤
  if (searchText.value) {
    const searchLower = searchText.value.toLowerCase()
    result = result.filter(member => 
      member.nickname.toLowerCase().includes(searchLower) ||
      member.qq.toLowerCase().includes(searchLower) ||
      (member.gameId && member.gameId.toLowerCase().includes(searchLower))
    )
  }

  // 授课状态过滤
  if (teachingStatusFilter.value) {
    result = result.filter(member => member.teachingStatus === teachingStatusFilter.value)
  }

  // 通过日期范围过滤
  if (passDateRange.value && passDateRange.value[0] && passDateRange.value[1]) {
    const startDate = new Date(passDateRange.value[0]).getTime()
    const endDate = new Date(passDateRange.value[1]).getTime()
    result = result.filter(member => {
      const passDate = new Date(member.passDate).getTime()
      return passDate >= startDate && passDate <= endDate
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
    sorter: (row1: PassedMember, row2: PassedMember) => Number(row1.qq) - Number(row2.qq)
  },
  {
    title: '游戏ID',
    key: 'gameId',
    width: 130,
    sorter: 'default'
  },
  {
    title: '通过日期',
    key: 'passDate',
    width: 130,
    sorter: (row1: PassedMember, row2: PassedMember) => 
      new Date(row1.passDate).getTime() - new Date(row2.passDate).getTime()
  },
  {
    title: '授课状态',
    key: 'teachingStatus',
    width: 120,
    sorter: (row1: PassedMember, row2: PassedMember) => {
      const statusOrder = {
        '观察期': 0,
        '允许授课': 1
      }
      return statusOrder[row1.teachingStatus] - statusOrder[row2.teachingStatus]
    },
    render(row: PassedMember) {
      return h(
        NTag,
        {
          type: row.teachingStatus === '允许授课' ? 'success' : 'warning',
          round: true
        },
        { default: () => row.teachingStatus }
      )
    }
  }
]

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
:deep(.n-data-table .n-data-table-td) {
  padding: 8px;
}

:deep(.n-tag--warning) {
  background-color: #fff7e6;
  color: #f0a020;
  border: 1px solid #f0a020;
}

:deep(.n-tag--success) {
  background-color: #e3f9e9;
  color: #18a058;
  border: 1px solid #18a058;
}
</style> 