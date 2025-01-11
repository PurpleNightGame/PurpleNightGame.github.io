import AV from 'leancloud-storage'
import { ensureClass } from './leancloud-init'

// 添加请求队列和限流控制
const requestQueue: (() => Promise<any>)[] = []
let isProcessing = false
const RETRY_DELAY = 2000 // 增加重试延迟时间到2秒
const MAX_RETRIES = 3 // 最大重试次数
const MIN_REQUEST_INTERVAL = 500 // 最小请求间隔（毫秒）
let lastRequestTime = 0 // 上次请求时间

// 处理请求队列
const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return
  isProcessing = true

  try {
    const request = requestQueue.shift()
    if (request) {
      // 确保请求间隔
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
      }
      
      await request()
      lastRequestTime = Date.now()
    }
  } finally {
    isProcessing = false
    if (requestQueue.length > 0) {
      // 增加队列处理间隔
      setTimeout(processQueue, MIN_REQUEST_INTERVAL)
    }
  }
}

// 包装 API 请求的函数
const withRetry = async <T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  try {
    return await operation()
  } catch (error: any) {
    if (error.code === 429 && retries > 0) {
      console.log(`Rate limited, retrying in ${RETRY_DELAY}ms...`)
      // 遇到限流时增加等待时间
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)))
      return withRetry(operation, retries - 1)
    }
    throw error
  }
}

// 包装所有 API 请求
const wrapRequest = <T>(operation: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const request = async () => {
      try {
        const result = await withRetry(operation)
        resolve(result)
      } catch (error: any) {
        console.error('Request failed:', error)
        if (error.code === 429) {
          // 如果是限流错误，将请求重新加入队列尾部
          requestQueue.push(request)
          // 增加延迟以避免立即重试
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        } else {
          reject(error)
        }
      }
    }
    requestQueue.push(request)
    processQueue()
  })
}

// 成员相关操作
export const MemberService = {
  // 获取所有成员
  async getAllMembers() {
    return wrapRequest(async () => {
      await ensureClass('training_members')
      const query = new AV.Query('training_members')
      const results = await query.find()
      return results.map(member => member.toJSON())
    })
  },

  // 添加成员
  async addMember(memberData: any) {
    return wrapRequest(async () => {
      await ensureClass('training_members')
      const Member = AV.Object.extend('training_members')
      const member = new Member()
      Object.keys(memberData).forEach(key => {
        member.set(key, memberData[key])
      })
      const result = await member.save()
      return result.toJSON()
    })
  },

  // 更新成员
  async updateMember(id: string, memberData: any) {
    return wrapRequest(async () => {
      await ensureClass('training_members')
      const member = AV.Object.createWithoutData('training_members', id)
      Object.keys(memberData).forEach(key => {
        member.set(key, memberData[key])
      })
      const result = await member.save()
      return result.toJSON()
    })
  },

  // 删除成员
  async deleteMember(id: string) {
    return wrapRequest(async () => {
      await ensureClass('training_members')
      const member = AV.Object.createWithoutData('training_members', id)
      await member.destroy()
    })
  }
}

// 请假记录相关操作
export const LeaveService = {
  // 获取所有请假记录
  async getAllLeaveRecords() {
    return wrapRequest(async () => {
      await ensureClass('leave_records')
      const query = new AV.Query('leave_records')
      const results = await query.find()
      return results.map(record => record.toJSON())
    })
  },

  // 添加请假记录
  async addLeaveRecord(leaveData: any) {
    return wrapRequest(async () => {
      await ensureClass('leave_records')
      const LeaveRecord = AV.Object.extend('leave_records')
      const record = new LeaveRecord()
      Object.keys(leaveData).forEach(key => {
        record.set(key, leaveData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  },

  // 更新请假记录
  async updateLeaveRecord(id: string, leaveData: any) {
    return wrapRequest(async () => {
      await ensureClass('leave_records')
      const record = AV.Object.createWithoutData('leave_records', id)
      Object.keys(leaveData).forEach(key => {
        record.set(key, leaveData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  }
}

// 黑点记录相关操作
export const BlacklistService = {
  // 获取所有黑点记录
  async getAllBlacklistRecords() {
    return wrapRequest(async () => {
      await ensureClass('blacklist_records')
      const query = new AV.Query('blacklist_records')
      const results = await query.find()
      return results.map(record => record.toJSON())
    })
  },

  // 添加黑点记录
  async addBlacklistRecord(recordData: any) {
    return wrapRequest(async () => {
      await ensureClass('blacklist_records')
      const BlacklistRecord = AV.Object.extend('blacklist_records')
      const record = new BlacklistRecord()
      Object.keys(recordData).forEach(key => {
        record.set(key, recordData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  },

  // 更新黑点记录
  async updateBlacklistRecord(id: string, recordData: any) {
    return wrapRequest(async () => {
      await ensureClass('blacklist_records')
      const record = AV.Object.createWithoutData('blacklist_records', id)
      Object.keys(recordData).forEach(key => {
        record.set(key, recordData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  }
}

// 退队记录相关操作
export const QuitService = {
  // 获取所有退队记录
  async getAllQuitRecords() {
    return wrapRequest(async () => {
      await ensureClass('quit_members')
      const query = new AV.Query('quit_members')
      query.addDescending('createdAt')
      const results = await query.find()
      return results.map(record => record.toJSON())
    })
  },

  // 添加退队记录
  async addQuitRecord(quitData: any) {
    return wrapRequest(async () => {
      await ensureClass('quit_members')
      
      // 查询是否存在相同成员的退队记录
      const query = new AV.Query('quit_members')
      query.equalTo('memberId', quitData.memberId)
      const existingRecord = await query.first()

      // 如果已存在记录，返回null表示添加失败
      if (existingRecord) {
        console.log('该成员已有退队记录')
        return null
      }

      // 如果不存在记录，创建新记录
      const QuitRecord = AV.Object.extend('quit_members')
      const record = new QuitRecord()
      Object.keys(quitData).forEach(key => {
        record.set(key, quitData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  },

  // 清理重复退队记录
  async cleanupDuplicateRecords() {
    return wrapRequest(async () => {
      await ensureClass('quit_members')
      
      // 获取所有记录
      const query = new AV.Query('quit_members')
      query.addDescending('createdAt')
      const allRecords = await query.find()
      
      // 使用 Map 来跟踪每个成员的最新记录
      const memberRecords = new Map<string, AV.Object>()
      const duplicateRecords: AV.Object[] = []

      // 遍历所有记录
      allRecords.forEach(record => {
        const memberId = record.get('memberId')
        if (!memberRecords.has(memberId)) {
          // 保留最新的记录
          memberRecords.set(memberId, record as AV.Object)
        } else {
          // 将重复记录添加到待删除列表
          duplicateRecords.push(record as AV.Object)
        }
      })

      // 如果有重复记录，删除它们
      if (duplicateRecords.length > 0) {
        await AV.Object.destroyAll(duplicateRecords)
        console.log(`已清理 ${duplicateRecords.length} 条重复记录`)
      }

      return {
        cleaned: duplicateRecords.length,
        remaining: memberRecords.size
      }
    })
  },

  // 删除退队记录
  async deleteQuitRecord(recordId: string) {
    return wrapRequest(async () => {
      const record = AV.Object.createWithoutData('quit_members', recordId)
      await record.destroy()
    })
  }
}

// 违规退队记录相关操作
export const BlacklistQuitService = {
  // 获取所有违规退队记录
  async getAllBlacklistQuitRecords() {
    return wrapRequest(async () => {
      await ensureClass('blacklist_quit_members')
      const query = new AV.Query('blacklist_quit_members')
      const results = await query.find()
      return results.map(record => record.toJSON())
    })
  },

  // 添加违规退队记录
  async addBlacklistQuitRecord(recordData: any) {
    return wrapRequest(async () => {
      await ensureClass('blacklist_quit_members')
      const BlacklistQuitRecord = AV.Object.extend('blacklist_quit_members')
      const record = new BlacklistQuitRecord()
      Object.keys(recordData).forEach(key => {
        record.set(key, recordData[key])
      })
      const result = await record.save()
      return result.toJSON()
    })
  }
}

export default {
  MemberService,
  LeaveService,
  BlacklistService,
  QuitService,
  BlacklistQuitService
} 