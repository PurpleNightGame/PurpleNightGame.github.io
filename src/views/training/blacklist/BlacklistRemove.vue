<template>
  <n-card>
    <template #header>
      <n-h2 style="margin: 0; color: #7B1FA2">黑点消除记录</n-h2>
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
      </n-space>

      <n-data-table
        :columns="columns"
        :data="filteredData"
        :loading="loading"
        :pagination="pagination"
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
  NForm,
  NFormItem,
  NDatePicker,
  NModal,
  useMessage,
  useDialog,
  NSelect,
  NInput,
  NIcon,
  NH2,
  NCard,
  NDescriptions,
  NDescriptionsItem
} from 'naive-ui'
import { SearchOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import { BlacklistService, MemberService } from '../../../utils/leancloud-service'

// 创建消息实例
const message = useMessage()
const dialog = useDialog()

// 表格加载状态
const loading = ref(false)

// 从数据库加载数据
const loadFromStorage = async () => {
  try {
    loading.value = true
    const members = await MemberService.getAllMembers()
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    
    // 按成员ID分组记录
    const memberRecords = new Map()
    blacklistRecords.forEach(record => {
      const memberRecordList = memberRecords.get(record.memberId) || []
      memberRecordList.push(record)
      memberRecords.set(record.memberId, memberRecordList)
    })
    
    // 处理每个成员的记录
    const now = new Date()
    const eligibleMembers = []
    
    for (const [memberId, recordList] of memberRecords.entries()) {
      // 按日期排序记录（最新的在前）
      recordList.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())
      
      // 获取最新记录
      const latestRecord = recordList[0]
      const latestDate = new Date(latestRecord.recordDate)
      
      // 计算时间差（毫秒）
      const timeDiff = now.getTime() - latestDate.getTime()
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      
      // 只有最新记录超过30天的成员才显示
      if (daysDiff > 30) {
        const member = members.find(m => m.objectId === memberId)
        eligibleMembers.push({
          memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qq : '',
          blacklistCount: recordList.length,
          blacklists: recordList
        })
      }
    }
    
    return eligibleMembers
  } catch (e) {
    console.error('Failed to load data:', e)
    message.error('加载数据失败')
    return []
  } finally {
    loading.value = false
  }
}

// 表格数据
const tableData = ref([])

// 搜索状态
const searchText = ref('')

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

  return result
})

// 查看黑点详情
const showBlacklistDetails = (row: any) => {
  dialog.info({
    title: '黑点详情',
    content: () => {
      return h(NDescriptions, {
        column: 1,
        labelPlacement: 'left',
        labelWidth: 100
      }, {
        default: () => row.blacklists.map((blacklist: any) => [
          h(NDescriptionsItem, {
            label: '记录日期'
          }, { default: () => blacklist.recordDate }),
          h(NDescriptionsItem, {
            label: '等级'
          }, { default: () => h(NTag, {
            type: blacklist.level === '严重警告' ? 'error' : 'warning'
          }, { default: () => blacklist.level }) }),
          h(NDescriptionsItem, {
            label: '原因'
          }, { default: () => blacklist.reason }),
          h(NDescriptionsItem, {
            label: '记录人'
          }, { default: () => blacklist.recorder }),
          h('div', { style: 'margin-bottom: 16px' })
        ]).flat()
      })
    },
    positiveText: '关闭'
  })
}

// 处理黑点消除
const handleRemoveBlacklist = async (row: any) => {
  try {
    loading.value = true
    
    // 获取该成员的所有黑点记录
    const blacklistRecords = await BlacklistService.getAllBlacklistRecords()
    const memberBlacklists = blacklistRecords.filter(record => record.memberId === row.memberId)
    
    // 删除所有黑点记录
    for (const record of memberBlacklists) {
      await BlacklistService.deleteBlacklistRecord(record.objectId)
    }
    
    message.success('黑点消除成功')
    // 从表格中移除该成员
    tableData.value = tableData.value.filter(item => item.memberId !== row.memberId)
  } catch (e) {
    console.error('Failed to remove blacklist:', e)
    message.error('黑点消除失败')
  } finally {
    loading.value = false
  }
}

// 表格列定义
const columns = [
  {
    title: '成员昵称',
    key: 'memberName',
    width: 130,
    sorter: (row1: any, row2: any) => 
      row1.memberName.localeCompare(row2.memberName)
  },
  {
    title: 'QQ号',
    key: 'memberQQ',
    width: 130,
    sorter: (row1: any, row2: any) => 
      Number(row1.memberQQ) - Number(row2.memberQQ)
  },
  {
    title: '黑点数量',
    key: 'blacklistCount',
    width: 100,
    sorter: (row1: any, row2: any) => 
      row1.blacklistCount - row2.blacklistCount
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
              onPositiveClick: () => handleRemoveBlacklist(row)
            },
            {
              default: () => '确认消除该成员的所有黑点？',
              trigger: () => h(
                NButton,
                {
                  quaternary: true,
                  circle: true,
                  size: 'small',
                  style: 'color: #18a058',
                },
                { icon: () => h(CheckmarkCircleOutline) }
              )
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
    tableData.value = await loadFromStorage()
  }, 60000) // 每分钟更新一次
}

// 组件挂载时加载数据和启动定时更新
onMounted(async () => {
  tableData.value = await loadFromStorage()
  startAutoUpdate()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
})

// 修改分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 30, 40, 50, 100],
  prefix: ({ itemCount }) => `共 ${itemCount} 条数据`,
  suffix: ({ page, pageSize, pageCount }) =>
    `第 ${page} 页 / 共 ${pageCount} 页`,
  itemCount: computed(() => filteredData.value.length)
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