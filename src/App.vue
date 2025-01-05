<template>
  <n-message-provider placement="top">
    <n-dialog-provider>
      <n-config-provider :theme="theme">
        <router-view v-if="initialized"></router-view>
        <div v-else></div>
      </n-config-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>

<script setup lang="ts">
import { NMessageProvider, NConfigProvider, NDialogProvider } from 'naive-ui'
import { lightTheme, type Component } from 'naive-ui'
import { 
  AlertCircleOutline,
  TimeOutline,
  PersonOutline,
  CalendarOutline,
  DocumentTextOutline
} from '@vicons/ionicons5'
import { h, onMounted, ref } from 'vue'
import { initializeTables } from './utils/leancloud-init'
import { useRouter } from 'vue-router'
import { authService } from './services/auth-service'

const theme = lightTheme
const router = useRouter()
const initialized = ref(false)

// 初始化检查
async function initializeApp() {
  try {
    // 1. 初始化数据表
    await initializeTables()
    
    // 2. 检查登录状态
    const user = await authService.getCurrentUser()
    if (!user) {
      await router.replace('/login')
    }
  } catch (e) {
    console.error('初始化失败:', e)
    await router.replace('/login')
  } finally {
    initialized.value = true
  }
}

// 在组件创建时立即执行初始化
initializeApp()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const trainingMenuOptions = [
  {
    label: '成员管理',
    key: 'member',
    icon: renderIcon(PersonOutline),
    children: [
      {
        label: '成员列表',
        key: 'member-list',
        path: '/training/member-list'
      },
      {
        label: '成员状态',
        key: 'member-status',
        path: '/training/member-status'
      },
      {
        label: '考核管理',
        key: 'assessment',
        path: '/training/assessment'
      }
    ]
  },
  {
    label: '时间管理',
    key: 'time',
    icon: renderIcon(TimeOutline),
    children: [
      {
        label: '日期总表',
        key: 'schedule',
        path: '/training/schedule'
      },
      {
        label: '催促名单',
        key: 'reminders',
        path: '/training/reminders'
      },
      {
        label: '未训名单',
        key: 'untrained',
        path: '/training/untrained'
      },
      {
        label: '通过名单',
        key: 'passed',
        path: '/training/passed'
      }
    ]
  },
  {
    label: '黑点管理',
    key: 'blacklist',
    icon: renderIcon(AlertCircleOutline),
    children: [
      {
        label: '黑点记录',
        key: 'blacklist-records',
        path: '/training/blacklist/records'
      },
      {
        label: '消除黑点',
        key: 'blacklist-remove',
        path: '/training/blacklist/remove'
      }
    ]
  },
  {
    label: '请假管理',
    key: 'leave',
    icon: renderIcon(CalendarOutline),
    children: [
      {
        label: '请假记录',
        key: 'leave-records',
        path: '/training/leave-records'
      },
      {
        label: '结束请假',
        key: 'end-leave',
        path: '/training/end-leave'
      }
    ]
  }
]
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
</style> 