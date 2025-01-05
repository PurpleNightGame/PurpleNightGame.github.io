import AV from 'leancloud-storage'
import { initTestUser } from './init-test-user'

// 初始化 LeanCloud
AV.init({
  appId: 'cCD4H1pwVQWoPETlxR5CLbQH-gzGzoHsz',
  appKey: 'BuI56qnGouF3lJ0KMGI14mpN',
  serverURL: 'https://ccd4h1pw.lc-cn-n1-shared.com'
})

// 确保数据表存在
export const ensureClass = async (className: string) => {
  try {
    const query = new AV.Query(className)
    await query.limit(0).find()
  } catch (e: any) {
    if (e.code === 101) {
      // 如果表不存在，创建一个空对象来触发表的创建
      const TestObject = AV.Object.extend(className)
      const testObject = new TestObject()
      
      // 如果是training_members表，设置字段类型
      if (className === 'training_members') {
        // 设置必要的字段，确保它们的类型正确
        testObject.set('nickname', '')  // String
        testObject.set('qq', '')        // String
        testObject.set('gameId', '')    // String
        testObject.set('joinTime', '')  // String
        testObject.set('stage', '未新训')  // String
        testObject.set('status', '正常')   // String
        testObject.set('lastTrainingDate', '') // String type
        testObject.set('passDate', '')        // String, optional
      }
      
      await testObject.save()
      // 创建后立即删除这个测试对象
      await testObject.destroy()
      console.log(`Created table ${className}`)
    } else {
      throw e
    }
  }
}

// 初始化所有需要的数据表
export async function initializeTables() {
  try {
    const tables = [
      'training_members',
      'leave_records',
      'blacklist_records',
      'quit_members',
      'blacklist_quit_members',
      'assessments',
      'ended_leaves',
      'blacklist_remove_records'
    ]
    
    console.log('Starting table initialization...')
    for (const table of tables) {
      try {
        await ensureClass(table)
        console.log(`Table ${table} initialized successfully`)
      } catch (e) {
        console.error(`Failed to initialize table ${table}:`, e)
      }
    }
    console.log('Table initialization completed')

    // 创建测试用户
    await initTestUser()
    
    return { success: true, message: '数据表结构已更新' }
  } catch (error) {
    console.error('Failed to initialize tables:', error)
    throw error
  }
} 