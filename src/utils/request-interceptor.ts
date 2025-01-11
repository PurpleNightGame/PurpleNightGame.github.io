import AV from 'leancloud-storage'
import { authService } from '../services/auth-service'
import { createDiscreteApi } from 'naive-ui'
import router from '../router'

const { message } = createDiscreteApi(['message'])

// 保存原始请求函数
const originalRequest = AV.request.bind(AV)

// 重写请求函数
AV.request = async function (options: {
  method: string
  path: string
  query?: object
  data?: object
  authOptions?: AV.AuthOptions
}): Promise<any> {
  try {
    const currentUser = await authService.getCurrentUser()
    if (!currentUser) {
      // 用户无效，清除数据并跳转到登录页
      localStorage.clear()
      message.error('登录已失效，请重新登录')
      router.replace('/login')
      throw new Error('用户未登录或登录已失效')
    }
    return originalRequest(options)
  } catch (error) {
    localStorage.clear()
    message.error('登录已失效，请重新登录')
    router.replace('/login')
    throw error
  }
}

export default AV 