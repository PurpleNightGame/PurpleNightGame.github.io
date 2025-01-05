import AV from 'leancloud-storage'

async function tryLogin(username: string, password: string): Promise<AV.User | null> {
  try {
    const user = await AV.User.logIn(username, password)
    return user
  } catch (error) {
    return null
  }
}

async function createUserIfNotExists(username: string, password: string, role: string) {
  try {
    // 先尝试登录
    let user = await tryLogin(username, password)
    
    if (!user) {
      // 如果登录失败，说明用户不存在，创建新用户
      const newUser = new AV.User()
      newUser.setUsername(username)
      newUser.setPassword(password)
      newUser.set('role', role)
      newUser.set('email', `${username}@example.com`) // LeanCloud要求邮箱
      
      await newUser.signUp()
      console.log(`${role}用户创建成功:`, username)
    } else {
      // 用户存在，更新角色
      user.set('role', role)
      await user.save()
      console.log(`更新${username}的角色为${role}`)
      // 更新后登出
      await AV.User.logOut()
    }
    return true
  } catch (error) {
    console.error(`处理${role}用户失败:`, error)
    return false
  }
}

export async function initTestUser() {
  try {
    // 创建管理员用户
    await createUserIfNotExists('admin', 'admin123', 'admin')
    // 创建普通用户
    await createUserIfNotExists('user', 'user123', 'user')
    return true
  } catch (error) {
    console.error('初始化测试用户失败:', error)
    return false
  }
} 