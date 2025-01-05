import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../layout/Layout.vue'
import Login from '../views/Login.vue'
import { authService } from '../services/auth-service'
import { createDiscreteApi } from 'naive-ui'

const { message } = createDiscreteApi(['message'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: Layout,
      redirect: '/training',
      children: [
        {
          path: '/hr',
          name: 'hr',
          component: () => import('../views/hr/Home.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, system: 'hr' }
        },
        {
          path: '/hr/members',
          name: 'hr-members',
          component: () => import('../views/hr/Members.vue'),
          meta: { requiresAuth: true, requiresAdmin: true, system: 'hr' }
        },
        {
          path: '/training',
          name: 'training',
          component: () => import('../views/training/Home.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/member/list',
          name: 'member-list',
          component: () => import('../views/training/member/MemberList.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/member/status',
          name: 'member-status',
          component: () => import('../views/training/member/MemberStatus.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/member/quit',
          name: 'member-quit',
          component: () => import('../views/training/member/MemberQuit.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/assessment',
          name: 'assessment',
          component: () => import('../views/training/member/Assessment.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/schedule',
          name: 'schedule',
          component: () => import('../views/training/time/Schedule.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/reminders',
          name: 'reminders',
          component: () => import('../views/training/time/Reminders.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/untrained',
          name: 'untrained',
          component: () => import('../views/training/time/Untrained.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/passed',
          name: 'passed',
          component: () => import('../views/training/time/Passed.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/leave-records',
          name: 'leave-records',
          component: () => import('../views/training/leave/LeaveRecords.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/end-leave',
          name: 'end-leave',
          component: () => import('../views/training/leave/EndLeave.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/blacklist/records',
          name: 'blacklist-records',
          component: () => import('../views/training/blacklist/BlacklistRecords.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/blacklist/remove',
          name: 'blacklist-remove',
          component: () => import('../views/training/blacklist/BlacklistRemove.vue'),
          meta: { requiresAuth: true, system: 'training' }
        },
        {
          path: '/training/blacklist/quit',
          name: 'blacklist-quit',
          component: () => import('../views/training/blacklist/BlacklistQuit.vue'),
          meta: { requiresAuth: true, system: 'training' }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  try {
    // 检查路由是否需要认证
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
    
    if (requiresAuth) {
      // 检查用户是否已登录
      const isAuthenticated = authService.isAuthenticated()
      if (!isAuthenticated) {
        next({ name: 'login' })
        return
      }

      // 如果需要管理员权限，检查用户角色
      if (requiresAdmin) {
        const user = authService.getCurrentUser()
        if (user?.role !== 'admin') {
          message.error('权限不足：需要管理员权限才能访问此页面')
          next('/training')
          return
        }
      }
    }

    // 如果用户已登录且尝试访问登录页，重定向到首页
    if (to.name === 'login' && authService.isAuthenticated()) {
      next('/training')
      return
    }

    next()
  } catch (error) {
    console.error('路由守卫错误:', error)
    message.error('系统错误，请重新登录')
    next({ name: 'login' })
  }
})

export default router 