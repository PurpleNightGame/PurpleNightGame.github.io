<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-layout position="absolute" style="height: 100%">
      <n-layout has-sider position="absolute">
        <n-layout-sider
          bordered
          collapse-mode="width"
          :collapsed-width="64"
          :width="240"
          show-trigger
          @collapse="collapsed = true"
          @expand="collapsed = false"
          class="custom-sider"
        >
          <div class="logo">
            <div class="logo-content" :class="{ 'logo-collapsed': collapsed }">
              <img src="https://s21.ax1x.com/2024/12/08/pA72i5R.png" alt="logo" />
              <span class="logo-title">紫夜公会</span>
            </div>
          </div>
          <n-menu
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="menuOptions"
            :value="activeKey"
            @update:value="handleMenuClick"
          />
        </n-layout-sider>
        <n-layout>
          <n-layout-header bordered class="header">
            <div class="header-content">
              <div class="header-title">紫夜公会管理系统</div>
              <div class="header-actions">
                <n-button-group style="margin-right: 16px;">
                  <n-button 
                    :type="currentSystem === 'hr' ? 'primary' : 'default'"
                    @click="switchSystem('hr')"
                  >
                    人事管理
                  </n-button>
                  <n-button 
                    :type="currentSystem === 'training' ? 'primary' : 'default'"
                    @click="switchSystem('training')"
                  >
                    新训管理
                  </n-button>
                </n-button-group>
                <n-button
                  quaternary
                  circle
                  class="refresh-button"
                  :loading="refreshing"
                  @click="handleRefreshAll"
                >
                  <template #icon>
                    <refresh-outline />
                  </template>
                </n-button>
                <n-dropdown
                  :options="userMenuOptions"
                  @select="handleMenuSelect"
                  trigger="click"
                >
                  <div class="avatar-wrapper">
                    <n-avatar
                      round
                      :size="32"
                      :src="userAvatar"
                      fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
                    />
                    <span class="username">{{ username }}</span>
                  </div>
                </n-dropdown>
              </div>
            </div>
          </n-layout-header>
          <div class="tabs-bar">
            <n-scrollbar x-scrollable>
              <div class="tabs-wrapper">
                <div
                  v-for="tab in tabs"
                  :key="tab.path"
                  class="tab"
                  :class="{ active: currentPath === tab.path }"
                  @click="handleTabClick(tab)"
                >
                  <span class="tab-icon">
                    <component :is="tab.icon || DocumentOutline" />
                  </span>
                  <span class="tab-label">{{ tab.label }}</span>
                  <n-button
                    v-if="tabs.length > 1"
                    quaternary
                    circle
                    size="tiny"
                    class="tab-close"
                    @click.stop="closeTab(tab)"
                  >
                    <template #icon>
                      <close-outline />
                    </template>
                  </n-button>
                </div>
              </div>
            </n-scrollbar>
          </div>
          <n-layout-content position="absolute" style="top: 104px; bottom: 0;">
            <div class="content-container">
              <router-view></router-view>
            </div>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </n-layout>
    <user-settings
      v-model="showUserSettings"
      @success="handleUserSettingsSuccess"
    />
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NIcon, useTheme, lightTheme } from 'naive-ui'
import type { MenuOption, GlobalThemeOverrides } from 'naive-ui'
import { 
  HomeOutline, 
  PeopleOutline, 
  TimeOutline, 
  CalendarOutline, 
  ListOutline, 
  StatsChartOutline, 
  RibbonOutline, 
  DocumentTextOutline, 
  AlarmOutline, 
  LogOutOutline, 
  CheckmarkCircleOutline, 
  DocumentOutline, 
  ExitOutline, 
  PersonOutline, 
  AlertCircleOutline,
  SettingsOutline,
  PersonCircleOutline,
  RefreshOutline,
  CloseOutline
} from '@vicons/ionicons5'
import { h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authService } from '../services/auth-service'
import { createDiscreteApi } from 'naive-ui'
import UserSettings from '../components/UserSettings.vue'
import { MemberService, LeaveService, BlacklistService, QuitService, BlacklistQuitService } from '@/utils/leancloud'
import { validateUser } from '@/utils/leancloud-service'

const { message } = createDiscreteApi(['message'])
const theme = lightTheme
const collapsed = ref(false)
const router = useRouter()
const route = useRoute()

// 计算当前系统
const currentSystem = computed(() => route.meta.system as string)

// 计算当前激活的菜单项
const activeKey = computed(() => {
  const path = route.path
  // 映射路径到菜单 key
  const pathKeyMap: Record<string, string> = {
    '/hr': 'hr-home',
    '/hr/members': 'members',
    '/training': 'training-home',
    '/training/member/list': 'member-list',
    '/training/member/status': 'member-status',
    '/training/member/quit': 'member-quit',
    '/training/assessment': 'assessment',
    '/training/schedule': 'schedule',
    '/training/reminders': 'reminders',
    '/training/untrained': 'untrained',
    '/training/passed': 'passed',
    '/training/leave-records': 'leave-records',
    '/training/end-leave': 'end-leave',
    '/training/blacklist/records': 'blacklist-records',
    '/training/blacklist/remove': 'blacklist-remove',
    '/training/blacklist/quit': 'blacklist-quit'
  }
  return pathKeyMap[path] || ''
})

// 系统菜单配置
const hrMenuOptions: MenuOption[] = [
  {
    label: '首页',
    key: 'hr-home',
    icon: renderIcon(HomeOutline),
    path: '/hr'
  },
  {
    label: '成员管理',
    key: 'members',
    icon: renderIcon(PeopleOutline),
    path: '/hr/members'
  }
]

const trainingMenuOptions: MenuOption[] = [
  {
    label: '首页',
    key: 'training-home',
    icon: renderIcon(HomeOutline),
    path: '/training'
  },
  {
    label: '成员管理',
    key: 'member-management',
    icon: renderIcon(PeopleOutline),
    children: [
      {
        label: '成员列表',
        key: 'member-list',
        icon: renderIcon(ListOutline),
        path: '/training/member/list'
      },
      {
        label: '成员状态',
        key: 'member-status',
        icon: renderIcon(StatsChartOutline),
        path: '/training/member/status'
      },
      {
        label: '考核管理',
        key: 'assessment',
        icon: renderIcon(RibbonOutline),
        path: '/training/assessment'
      },
      {
        label: '退队审批',
        key: 'member-quit',
        icon: renderIcon(ExitOutline),
        path: '/training/member/quit'
      }
    ]
  },
  {
    label: '时间管理',
    key: 'time-management',
    icon: renderIcon(TimeOutline),
    children: [
      {
        label: '日期总表',
        key: 'schedule',
        icon: renderIcon(CalendarOutline),
        path: '/training/schedule'
      },
      {
        label: '催促新训',
        key: 'reminders',
        icon: renderIcon(AlarmOutline),
        path: '/training/reminders'
      },
      {
        label: '未训退队',
        key: 'untrained',
        icon: renderIcon(LogOutOutline),
        path: '/training/untrained'
      },
      {
        label: '考核通过',
        key: 'passed',
        icon: renderIcon(CheckmarkCircleOutline),
        path: '/training/passed'
      }
    ]
  },
  {
    label: '请假管理',
    key: 'leave-management',
    icon: renderIcon(DocumentOutline),
    children: [
      {
        label: '请假记录',
        key: 'leave-records',
        icon: renderIcon(DocumentTextOutline),
        path: '/training/leave-records'
      },
      {
        label: '结束请假',
        key: 'end-leave',
        icon: renderIcon(ExitOutline),
        path: '/training/end-leave'
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
        icon: renderIcon(DocumentTextOutline),
        path: '/training/blacklist/records'
      },
      {
        label: '消除黑点',
        key: 'blacklist-remove',
        icon: renderIcon(CheckmarkCircleOutline),
        path: '/training/blacklist/remove'
      },
      {
        label: '违规退队',
        key: 'blacklist-quit',
        icon: renderIcon(ExitOutline),
        path: '/training/blacklist/quit'
      }
    ]
  }
]

// 根据当前系统计算菜单选项
const menuOptions = computed(() => {
  const system = route.meta.system as string
  if (system === 'training') {
    return [
      {
        label: '首页',
        key: 'training-home',
        icon: renderIcon(HomeOutline),
        path: '/training'
      },
      {
        label: '成员管理',
        key: 'member',
        icon: renderIcon(PeopleOutline),
        children: [
          {
            label: '成员列表',
            key: 'member-list',
            icon: renderIcon(ListOutline),
            path: '/training/member/list'
          },
          {
            label: '成员状态',
            key: 'member-status',
            icon: renderIcon(StatsChartOutline),
            path: '/training/member/status'
          },
          {
            label: '考核管理',
            key: 'assessment',
            icon: renderIcon(RibbonOutline),
            path: '/training/assessment'
          },
          {
            label: '退队审批',
            key: 'member-quit',
            path: '/training/member/quit',
            icon: renderIcon(ExitOutline)
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
            icon: renderIcon(CalendarOutline),
            path: '/training/schedule'
          },
          {
            label: '催促名单',
            key: 'reminders',
            icon: renderIcon(AlarmOutline),
            path: '/training/reminders'
          },
          {
            label: '未训名单',
            key: 'untrained',
            icon: renderIcon(LogOutOutline),
            path: '/training/untrained'
          },
          {
            label: '通过名单',
            key: 'passed',
            icon: renderIcon(CheckmarkCircleOutline),
            path: '/training/passed'
          }
        ]
      },
      {
        label: '请假管理',
        key: 'leave',
        icon: renderIcon(DocumentOutline),
        children: [
          {
            label: '请假记录',
            key: 'leave-records',
            icon: renderIcon(DocumentTextOutline),
            path: '/training/leave-records'
          },
          {
            label: '结束请假',
            key: 'end-leave',
            icon: renderIcon(ExitOutline),
            path: '/training/end-leave'
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
            icon: renderIcon(DocumentTextOutline),
            path: '/training/blacklist/records'
          },
          {
            label: '消除黑点',
            key: 'blacklist-remove',
            icon: renderIcon(CheckmarkCircleOutline),
            path: '/training/blacklist/remove'
          },
          {
            label: '违规退队',
            key: 'blacklist-quit',
            icon: renderIcon(ExitOutline),
            path: '/training/blacklist/quit'
          }
        ]
      }
    ]
  }
  return hrMenuOptions
})

// 切换系统
const switchSystem = (system: string) => {
  if (system === 'hr') {
    router.push('/hr')
  } else {
    router.push('/training')
  }
}

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const handleMenuClick = (key: string) => {
  // 遍历所有菜单项及其子项来查找匹配的路径
  const findMenuPath = (options: MenuOption[]): string | undefined => {
    for (const option of options) {
      if (option.key === key) {
        return option.path as string
      }
      if (option.children) {
        const path = findMenuPath(option.children)
        if (path) return path
      }
    }
  }

  const allMenuOptions = [...hrMenuOptions, ...trainingMenuOptions]
  const path = findMenuPath(allMenuOptions)
  
  if (path) {
    router.push(path)
  }
}

// 自定义主题配置
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#7B1FA2',
    primaryColorHover: '#9C27B0',
    primaryColorPressed: '#6A1B9A',
    primaryColorSuppl: '#9575CD'
  },
  Menu: {
    itemTextColor: '#666',
    itemIconColor: '#666',
    itemColorActive: '#EDE7F6',
    itemTextColorActive: '#7B1FA2',
    itemIconColorActive: '#7B1FA2'
  },
  Layout: {
    headerColor: '#fff',
    siderColor: '#fff'
  }
}

// 用户信息
const username = computed(() => {
  const user = authService.getCurrentUser()
  if (!user) {
    // 如果未登录，重定向到登录页面
    router.replace('/login')
    return ''
  }
  return user.username
})

// 用户头像
const userAvatar = computed(() => {
  const user = authService.getCurrentUser()
  return user?.avatar || 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
})

// 用户菜单选项
const userMenuOptions = [
  {
    label: '用户设置',
    key: 'settings',
    icon: renderIcon(SettingsOutline)
  },
  {
    type: 'divider'
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline)
  }
]

// 处理用户菜单选择
const showUserSettings = ref(false)

const handleMenuSelect = async (key: string) => {
  if (key === 'logout') {
    try {
      await authService.logout()
      message.success('已退出登录')
      router.push('/login')
    } catch (error) {
      message.error('退出登录失败')
    }
  } else if (key === 'settings') {
    showUserSettings.value = true
  }
}

// 处理用户设置成功
const handleUserSettingsSuccess = () => {
  message.success('设置已更新')
}

// 添加刷新状态
const refreshing = ref(false)

// 添加页面路由列表
const refreshPages = [
  // 成员管理
  '/training/member/list',      // 成员列表
  '/training/member/status',    // 成员状态
  '/training/assessment',       // 考核管理
  '/training/member/quit',      // 退队审批
  
  // 时间管理
  '/training/schedule',         // 日期总表
  '/training/reminders',        // 催促名单
  '/training/untrained',        // 未训名单
  '/training/passed',           // 通过名单
  
  // 请假管理
  '/training/leave-records',    // 请假记录
  '/training/end-leave',        // 结束请假
  
  // 黑点管理
  '/training/blacklist/records', // 黑点记录
  '/training/blacklist/remove',  // 消除黑点
  '/training/blacklist/quit'     // 违规退队
]

// 修改刷新所有数据的方法
const handleRefreshAll = async () => {
  if (refreshing.value) return
  refreshing.value = true

  try {
    // 先进行一次用户验证
    await validateUser()

    // 保存当前页面路径
    const currentRoute = router.currentRoute.value

    // 遍历所有页面
    for (const path of refreshPages) {
      message.info(`正在刷新${path}页面数据...`)
      
      // 切换到目标页面
      await router.push(path)
      
      // 等待页面加载和数据刷新
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 返回原始页面
    await router.push({
      path: currentRoute.path,
      query: { ...currentRoute.query, _t: Date.now() }
    })

    message.success('所有页面刷新成功')
  } catch (error: any) {
    console.error('刷新失败:', error)
    message.error('刷新失败: ' + (error.message || '未知错误'))
  } finally {
    refreshing.value = false
  }
}

// 定义标签页接口
interface Tab {
  path: string
  label: string
  icon?: any
  closable?: boolean
}

// 标签页状态
const tabs = ref<Tab[]>([])
const currentPath = computed(() => route.path)

// 查找菜单选项
const findMenuOption = (options: MenuOption[], path: string): MenuOption | null => {
  for (const option of options) {
    if (option.path === path) {
      return option
    }
    if (option.children) {
      const found = findMenuOption(option.children, path)
      if (found) return found
    }
  }
  return null
}

// 处理标签点击
const handleTabClick = (tab: Tab) => {
  if (tab.path !== currentPath.value) {
    router.push(tab.path)
  }
}

// 关闭标签页
const closeTab = (tab: Tab) => {
  const index = tabs.value.findIndex(t => t.path === tab.path)
  if (index > -1) {
    tabs.value.splice(index, 1)
    // 如果关闭的是当前标签，则跳转到最后一个标签
    if (tab.path === currentPath.value) {
      const lastTab = tabs.value[tabs.value.length - 1]
      router.push(lastTab.path)
    }
  }
}

// 监听路由变化，自动添加标签页
watch(
  () => route,
  (newRoute) => {
    const path = newRoute.path
    const existingTab = tabs.value.find(tab => tab.path === path)
    
    if (!existingTab) {
      // 获取菜单配置中的标签信息
      const menuOption = findMenuOption([...hrMenuOptions, ...trainingMenuOptions], path)
      if (menuOption) {
        tabs.value.push({
          path,
          label: menuOption.label as string,
          icon: menuOption.icon,
          closable: true
        })
      }
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.header {
  height: 64px;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-title {
  font-size: 18px;
  font-weight: 500;
  color: #7B1FA2;
}

.header-actions {
  display: flex;
  align-items: center;
}

.logo {
  height: 64px;
  overflow: hidden;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease-in-out;
}

.logo-content {
  height: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease-in-out;
}

.logo-content img {
  height: 32px;
  width: 32px;
  min-width: 32px;
  margin-right: 12px;
  transition: all 0.3s ease-in-out;
}

.logo-title {
  font-size: 18px;
  font-weight: bold;
  color: #7B1FA2;
  white-space: nowrap;
  opacity: 1;
  transition: all 0.3s ease-in-out;
}

.logo-collapsed {
  padding: 0 16px;
}

.logo-collapsed .logo-title {
  opacity: 0;
  width: 0;
  margin-left: -12px;
}

.custom-sider {
  border-right: 1px solid #eee;
}

.content-container {
  padding: 24px;
  height: 100%;
  overflow: auto;
}

/* 添加全局样式 */
:global(html, body, #app) {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 优化菜单过渡效果 */
:deep(.n-layout-sider-scroll-container) {
  transition: all 0.3s ease-in-out;
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 4px;
    display: block;
  }

  &::-webkit-scrollbar-thumb {
    background: #c8a5d9;
    border-radius: 2px;
    transition: all 0.3s;
    visibility: visible;

    &:hover {
      background: #7B1FA2;
    }
  }

  &::-webkit-scrollbar-track {
    background: #f0f0f0;
    visibility: visible;
  }
}

/* 内容区域滚动条样式 */
.content-container::-webkit-scrollbar {
  width: 6px;
  display: block;
}

.content-container::-webkit-scrollbar-thumb {
  background: #c8a5d9;
  border-radius: 3px;
  transition: all 0.3s;
  visibility: visible;

  &:hover {
    background: #7B1FA2;
  }
}

.content-container::-webkit-scrollbar-track {
  background: #f0f0f0;
  visibility: visible;
}

/* 确保滚动条容器显示 */
.content-container {
  overflow-y: auto !important;
}

:deep(.n-layout-sider-scroll-container) {
  overflow-y: auto !important;
}

:deep(.n-menu-item-content) {
  transition: all 0.3s ease-in-out;
}

:deep(.n-menu-item-content__icon) {
  transition: all 0.3s ease-in-out;
}

:deep(.n-menu-item-content__text) {
  transition: opacity 0.3s ease-in-out;
}

/* 确保滚动条在悬停时更明显 */
.content-container:hover::-webkit-scrollbar-thumb,
:deep(.n-layout-sider-scroll-container:hover::-webkit-scrollbar-thumb) {
  background: #9c27b0;
}

.layout {
  height: 100vh;
}

.header {
  height: 64px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #eee;
}

.header-content {
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.user-menu {
  display: flex;
  align-items: center;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: all 0.3s ease-in-out;
}

.avatar-wrapper:hover {
  background-color: rgba(123, 31, 162, 0.1);
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.sider {
  background: white;
}

.content {
  padding: 24px;
  background: #f5f5f5;
}

:deep(.n-dropdown-menu) {
  min-width: 120px;
}

:deep(.n-dropdown-option) {
  padding: 8px 12px;
}

:deep(.n-dropdown-option-body--selected) {
  color: #7B1FA2;
}

:deep(.n-dropdown-option:hover) {
  background-color: rgba(123, 31, 162, 0.1);
}

.refresh-button {
  margin-right: 16px;
  transition: all 0.3s ease;
}

.refresh-button:hover {
  background-color: rgba(121, 40, 202, 0.1);
  color: #7928CA;
}

.refresh-button:active {
  transform: scale(0.95);
}

.tabs-bar {
  height: 40px;
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 0 16px;
  box-sizing: border-box;
  overflow: hidden; /* 防止出现垂直滚动条 */
}

.tabs-wrapper {
  display: inline-flex;
  height: 100%;
  padding: 4px 0;
  box-sizing: border-box;
  flex-wrap: nowrap; /* 防止标签换行 */
}

/* 自定义水平滚动条样式 */
:deep(.n-scrollbar.n-scrollbar--horizontal) {
  height: 40px !important; /* 确保滚动区域高度正确 */
}

:deep(.n-scrollbar-rail.n-scrollbar-rail--horizontal) {
  height: 4px !important; /* 调整水平滚动条高度 */
  bottom: 0 !important;
}

:deep(.n-scrollbar-content) {
  display: flex !important;
  align-items: center !important;
  height: 100% !important;
}

.tab {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  margin-right: 6px;
  border-radius: 6px;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.tab:hover {
  background: #ede7f6;
  color: #7B1FA2;
}

.tab.active {
  background: #7B1FA2;
  color: #fff;
}

.tab-icon {
  margin-right: 6px;
  display: flex;
  align-items: center;
}

.tab-label {
  margin-right: 4px;
}

.tab-close {
  opacity: 0;
  transition: all 0.3s ease;
  margin-left: 4px;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab.active .tab-close {
  opacity: 1;
  color: #fff;
}

.tab-close:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

/* 调整内容区域的位置，为标签栏留出空间 */
.content-container {
  height: calc(100% - 40px);
}
</style> 