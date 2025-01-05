import AV from 'leancloud-storage'

export interface User {
  id: string
  username: string
  role: string | null
  avatar?: string
  sessionToken?: string
}

interface UpdateUserInfo {
  username: string
  avatar?: string
  oldPassword?: string
  newPassword?: string
}

class AuthService {
  private currentUser: User | null = null

  async validateSession(sessionToken: string): Promise<User | null> {
    try {
      // 使用会话令牌恢复用户状态
      const user = await AV.User.become(sessionToken)
      if (!user) {
        return null
      }
      
      const userData: User = {
        id: user.id || '',
        username: this.ensureString(user.get('username'), 'unknown'),
        role: user.get('role') || null,
        avatar: user.get('avatar'),
        sessionToken: user.getSessionToken() || undefined
      }
      
      this.currentUser = userData
      return userData
    } catch (error) {
      console.error('Session validation failed:', error)
      return null
    }
  }

  async login(username: string, password: string): Promise<User> {
    try {
      const user = await AV.User.logIn(username, password)
      if (!user) {
        throw new Error('登录失败：未获取到用户信息')
      }
      
      const storedUsername = user.get('username')
      const userData: User = {
        id: user.id || '',
        username: this.ensureString(storedUsername, username),
        role: user.get('role') || null,
        avatar: user.get('avatar'),
        sessionToken: user.getSessionToken() || undefined
      }
      
      this.currentUser = userData
      return userData
    } catch (error: any) {
      throw new Error('登录失败：' + error.message)
    }
  }

  async logout(): Promise<void> {
    try {
      await AV.User.logOut()
      this.currentUser = null
      // 清除所有本地存储的登录信息
      const keys = ['rememberLogin', 'username', 'userRole', 'sessionToken', 'userId']
      keys.forEach(key => localStorage.removeItem(key))
    } catch (error: any) {
      throw new Error('退出登录失败：' + error.message)
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      const user = AV.User.current()
      if (user) {
        const storedUsername = user.get('username')
        this.currentUser = {
          id: user.id || '',
          username: this.ensureString(storedUsername, 'unknown'),
          role: user.get('role') || null,
          avatar: user.get('avatar') || undefined
        }
      }
    }
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser()
  }

  private ensureString(value: any, defaultValue: string): string {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
    return defaultValue
  }

  async updateUserInfo(info: UpdateUserInfo): Promise<User> {
    try {
      const user = AV.User.current()
      if (!user) {
        throw new Error('用户未登录')
      }

      // 如果要更新密码
      if (info.oldPassword && info.newPassword) {
        try {
          // 先验证旧密码是否正确
          const currentUsername = user.get('username')
          if (!currentUsername) {
            throw new Error('获取用户名失败')
          }
          
          await AV.User.logIn(currentUsername, info.oldPassword)
          
          // 更新密码
          const currentUser = AV.User.current()
          if (!currentUser) {
            throw new Error('获取当前用户失败')
          }
          await (currentUser as any).updatePassword(info.oldPassword, info.newPassword)
          
          // 重新登录以更新 session
          await AV.User.logIn(currentUsername, info.newPassword)
        } catch (error: any) {
          if (error.code === 210) {
            throw new Error('旧密码不正确')
          }
          throw new Error('更新密码失败：' + error.message)
        }
      }

      // 更新用户名
      if (info.username && info.username !== user.get('username')) {
        user.set('username', info.username)
      }

      // 更新头像
      if (info.avatar) {
        user.set('avatar', info.avatar)
      }

      // 保存更改
      await user.save()

      // 更新本地用户信息
      const storedUsername = user.get('username')
      const userData: User = {
        id: user.id || '',
        username: this.ensureString(storedUsername, info.username),
        role: user.get('role') || null,
        avatar: user.get('avatar') || undefined
      }
      
      this.currentUser = userData
      return userData
    } catch (error: any) {
      throw new Error(error.message || '更新用户信息失败')
    }
  }
}

export const authService = new AuthService() 