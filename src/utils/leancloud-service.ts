import AV from 'leancloud-storage'
import { ensureClass } from './leancloud-init'
import { calculateMemberStatus } from './memberStatus'
import { formatDate } from './date'
import { QuitService } from './quit-service'

// 添加类型定义
interface EndedLeaveRecord {
  objectId?: string
  memberId: string
  memberName: string
  memberQQ: string
  startDate: string
  endDate: string
  endedDate: string
  status: string
  reason: string
  [key: string]: string | undefined
}

// 添加保留字段列表
const RESERVED_KEYS = ['objectId', 'createdAt', 'updatedAt']

// 修改日期处理工具函数
const formatDate = (date: Date | null): string | null => {
  if (!date) return null
  return date.toLocaleDateString('zh-CN').replace(/\//g, '-')
}

const getLocalDate = (timestamp: number | string | null): Date | null => {
  if (!timestamp) return null
  return typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
}

// 成员状态类型
type MemberStatus = '正常' | '异常' | '催促参训' | '未训退队' | '超时退队' | '违规退队'

// 成员相关操作
export const MemberService = {
  // 重新初始化数据表
  async reinitializeTable() {
    await ensureClass('training_members')
    return { success: true, message: '数据表结构已更新' }
  },

  // 获取所有成员
  async getAllMembers() {
    await ensureClass('training_members')
    const query = new AV.Query('training_members')
    const results = await query.find()
    const members = results.map(member => member.toJSON())

    // 检查并更新成员状态
    const now = new Date()

    for (const member of members) {
      if (member.stage === '未新训' && member.leaveRequest !== '通过') {
        const joinDate = new Date(member.joinTime)
        const daysSinceJoin = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // 根据加入时间计算状态
        const newStatus = daysSinceJoin > 3 ? '未训退队' : '催促参训'
        
        // 只有当成员没有通过留队申请时才更新状态
        if (daysSinceJoin > 3 && member.status !== '未训退队' && member.leaveRequest !== '通过') {
          // 更新数据库中的状态
          await this.updateMember(member.objectId, {
            ...member,
            status: newStatus
          })

          // 添加退队记录
          try {
            const quitQuery = new AV.Query('quit_members')
            quitQuery.equalTo('memberId', member.objectId)
            const quitRecords = await quitQuery.find()
            
            if (quitRecords.length === 0) {
              await QuitService.addQuitRecord({
                memberId: member.objectId,
                memberName: member.nickname,
                memberQQ: member.qq,
                quitDate: formatDate(now),
                reason: '未参训',
                type: '未训退队'
              })
            }
          } catch (e) {
            console.error('Failed to add quit record:', e)
          }

          member.status = newStatus
        }
      }
    }

    return members
  },

  // 获取单个成员
  async getMember(id: string) {
    await ensureClass('training_members')
    const query = new AV.Query('training_members')
    const result = await query.get(id)
    return result.toJSON()
  },

  // 添加成员
  async addMember(memberData: any) {
    await ensureClass('training_members')
    const Member = AV.Object.extend('training_members')
    const member = new Member()
    
    // 处理日期
    const joinDate = getLocalDate(memberData.joinDate)
    const lastTrainingDate = memberData.lastTrainingDate ? getLocalDate(memberData.lastTrainingDate) : null
    
    const data = { 
      ...memberData,
      joinDate: formatDate(joinDate),
      lastTrainingDate: lastTrainingDate ? formatDate(lastTrainingDate) : null,
      // 如果阶段是未新训，则初始状态设为催促参训
      status: memberData.stage === '未新训' ? '催促参训' : '正常'
    }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      member.set(key, data[key])
    })
    const result = await member.save()
    return result.toJSON()
  },

  // 更新成员信息
  async updateMember(id: string, memberData: any) {
    try {
      await ensureClass('training_members')
      const member = AV.Object.createWithoutData('training_members', id)
      
      // 获取当前的黑点记录和请假记录
      const blacklistQuery = new AV.Query('blacklist_records')
      const leaveQuery = new AV.Query('leave_records')
      const [blacklistResults, leaveResults] = await Promise.all([
        blacklistQuery.find(),
        leaveQuery.find()
      ])
      const blacklistRecords = blacklistResults.map(record => record.toJSON())
      const leaveRecords = leaveResults.map(record => record.toJSON())

      // 如果要更新状态，先重新计算
      if ('status' in memberData || 'leaveRequest' in memberData) {
        // 如果留队申请通过，强制设置状态为正常
        if (memberData.leaveRequest === '通过') {
          memberData.status = '正常'
        } else {
          const currentStatus = calculateMemberStatus(memberData, blacklistRecords, leaveRecords)
          memberData.status = currentStatus
        }
      }
      
      // 单独处理每个字段
      for (const [key, value] of Object.entries(memberData)) {
        if (key !== 'objectId' && key !== 'id') {
          member.set(key, value)
        }
      }

      console.log('准备保存的数据:', memberData)
      await member.save()
      return member.toJSON()
    } catch (error) {
      console.error('Failed to update member:', error)
      throw error
    }
  },

  // 删除成员
  async deleteMember(id: string) {
    await ensureClass('training_members')
    
    try {
      // 删除成员本身
      const member = AV.Object.createWithoutData('training_members', id)
      await member.destroy()

      // 删除相关的请假记录
      const leaveQuery = new AV.Query('leave_records')
      leaveQuery.equalTo('memberId', id)
      const leaveRecords = await leaveQuery.find()
      for (const record of leaveRecords) {
        await record.destroy()
      }

      // 删除相关的已结束请假记录
      const endedLeaveQuery = new AV.Query('ended_leaves')
      endedLeaveQuery.equalTo('memberId', id)
      const endedLeaveRecords = await endedLeaveQuery.find()
      for (const record of endedLeaveRecords) {
        await record.destroy()
      }

      // 删除相关的黑点记录
      const blacklistQuery = new AV.Query('blacklist_records')
      blacklistQuery.equalTo('memberId', id)
      const blacklistRecords = await blacklistQuery.find()
      for (const record of blacklistRecords) {
        await record.destroy()
      }

      // 删除相关的黑点消除记录
      const blacklistRemoveQuery = new AV.Query('blacklist_remove_records')
      blacklistRemoveQuery.equalTo('memberId', id)
      const blacklistRemoveRecords = await blacklistRemoveQuery.find()
      for (const record of blacklistRemoveRecords) {
        await record.destroy()
      }

      // 删除相关的考核记录
      const assessmentQuery = new AV.Query('assessments')
      assessmentQuery.equalTo('memberId', id)
      const assessmentRecords = await assessmentQuery.find()
      for (const record of assessmentRecords) {
        await record.destroy()
      }

      // 删除相关的退队记录
      const quitQuery = new AV.Query('quit_members')
      quitQuery.equalTo('memberId', id)
      const quitRecords = await quitQuery.find()
      for (const record of quitRecords) {
        await record.destroy()
      }

      // 删除相关的违规退队记录
      const blacklistQuitQuery = new AV.Query('blacklist_quit_members')
      blacklistQuitQuery.equalTo('memberId', id)
      const blacklistQuitRecords = await blacklistQuitQuery.find()
      for (const record of blacklistQuitRecords) {
        await record.destroy()
      }

    } catch (e) {
      console.error('Failed to delete member and related records:', e)
      throw e
    }
  }
}

// 请假记录相关操作
export const LeaveService = {
  // 获取所有请假记录
  async getAllLeaveRecords() {
    await ensureClass('leave_records')
    const query = new AV.Query('leave_records')
    query.descending('createdAt') // 按创建时间降序排序
    const results = await query.find()
    const records = results.map(record => record.toJSON())

    // 检查并更新过期的请假记录
    const now = new Date()
    const formattedToday = formatDate(now)
    if (!formattedToday) return records

    for (const record of records) {
      if (record.status === '请假中') {
        const endDate = new Date(record.endDate)
        const today = new Date(formattedToday)
        
        // 只有当结束日期小于今天时，才更新状态为"等待销假"
        if (endDate < today) {
          // 更新状态为"等待销假"
          await this.updateLeaveRecord(record.objectId, {
            ...record,
            status: '等待销假'
          })
          record.status = '等待销假'
        }
      }
    }

    return records
  },

  // 获取单个请假记录
  async getLeaveRecord(id: string) {
    await ensureClass('leave_records')
    const query = new AV.Query('leave_records')
    const result = await query.get(id)
    return result.toJSON()
  },

  // 添加请假记录
  async addLeaveRecord(leaveData: any) {
    await ensureClass('leave_records')
    const LeaveRecord = AV.Object.extend('leave_records')
    const record = new LeaveRecord()
    
    // 处理日期
    const startDate = getLocalDate(leaveData.startDate)
    const endDate = getLocalDate(leaveData.endDate)
    
    const data = { 
      ...leaveData,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      status: '请假中'
    }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  },

  // 更新请假记录
  async updateLeaveRecord(id: string, leaveData: any) {
    await ensureClass('leave_records')
    const record = AV.Object.createWithoutData('leave_records', id)
    const data = { ...leaveData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  },

  // 销假
  async endLeave(id: string, endedDate: string) {
    try {
      // 1. 获取原请假记录
      const leaveRecord = await this.getLeaveRecord(id)
      const now = new Date()
      const formattedDate = formatDate(now)
      if (!formattedDate) throw new Error('Invalid date')
      
      // 2. 更新原请假记录状态为"已销假"
      await this.updateLeaveRecord(id, {
        ...leaveRecord,
        status: '已销假',
        endedDate: formattedDate
      })

      // 3. 添加销假记录
      await this.addEndedLeaveRecord({
        memberId: leaveRecord.memberId,
        memberName: leaveRecord.memberName,
        memberQQ: leaveRecord.memberQQ,
        startDate: leaveRecord.startDate,
        endDate: leaveRecord.endDate,
        endedDate: formattedDate,
        status: '已销假',
        reason: leaveRecord.reason
      })

      // 4. 更新成员的最后一次新训时间
      const member = await MemberService.getMember(leaveRecord.memberId)
      if (member) {
        await MemberService.updateMember(leaveRecord.memberId, {
          ...member,
          lastTrainingDate: formattedDate
        })
      }

    } catch (e) {
      console.error('Failed to end leave:', e)
      throw e
    }
  },

  // 获取所有结束请假记录
  async getEndedLeaveRecords() {
    try {
      await ensureClass('ended_leaves')
      const query = new AV.Query('ended_leaves')
      const results = await query.find()
      return results.map(result => ({
        objectId: result.id,
        ...result.toJSON()
      }))
    } catch (e) {
      console.error('Failed to get ended leave records:', e)
      throw e
    }
  },

  // 添加结束请假记录
  async addEndedLeaveRecord(record: EndedLeaveRecord) {
    try {
      await ensureClass('ended_leaves')
      const EndedLeave = AV.Object.extend('ended_leaves')
      const endedLeave = new EndedLeave()
      
      const data = { ...record }
      RESERVED_KEYS.forEach(key => delete data[key])
      Object.keys(data).forEach(key => {
        endedLeave.set(key, data[key])
      })
      
      const result = await endedLeave.save()
      return {
        objectId: result.id,
        ...result.toJSON()
      }
    } catch (e) {
      console.error('Failed to add ended leave record:', e)
      throw e
    }
  },

  // 删除结束请假记录
  async deleteEndedLeaveRecord(id: string) {
    try {
      await ensureClass('ended_leaves')
      const endedLeave = AV.Object.createWithoutData('ended_leaves', id)
      await endedLeave.destroy()
    } catch (e) {
      console.error('Failed to delete ended leave record:', e)
      throw e
    }
  },

  // 删除请假记录
  async deleteLeaveRecord(id: string) {
    try {
      await ensureClass('leave_records')
      const record = AV.Object.createWithoutData('leave_records', id)
      await record.destroy()
    } catch (e) {
      console.error('Failed to delete leave record:', e)
      throw e
    }
  }
}

// 黑点记录相关操作
export const BlacklistService = {
  // 获取所有黑点记录
  async getAllBlacklistRecords() {
    await ensureClass('blacklist_records')
    const query = new AV.Query('blacklist_records')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 获取所有黑点消除记录
  async getAllBlacklistRemoveRecords() {
    await ensureClass('blacklist_remove_records')
    const query = new AV.Query('blacklist_remove_records')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加黑点记录
  async addBlacklistRecord(recordData: any) {
    await ensureClass('blacklist_records')
    const BlacklistRecord = AV.Object.extend('blacklist_records')
    const record = new BlacklistRecord()
    
    Object.keys(recordData).forEach(key => {
      record.set(key, recordData[key])
    })
    
    const result = await record.save()
    return result.toJSON()
  },

  // 添加黑点消除记录
  async addBlacklistRemoveRecord(recordData: any) {
    await ensureClass('blacklist_remove_records')
    const BlacklistRemoveRecord = AV.Object.extend('blacklist_remove_records')
    const record = new BlacklistRemoveRecord()
    
    Object.keys(recordData).forEach(key => {
      record.set(key, recordData[key])
    })
    
    const result = await record.save()
    return result.toJSON()
  },

  // 更新黑点记录
  async updateBlacklistRecord(id: string, recordData: any) {
    await ensureClass('blacklist_records')
    const record = AV.Object.createWithoutData('blacklist_records', id)
    
    Object.keys(recordData).forEach(key => {
      record.set(key, recordData[key])
    })
    
    const result = await record.save()
    return result.toJSON()
  },

  // 删除黑点记录
  async deleteBlacklistRecord(id: string) {
    await ensureClass('blacklist_records')
    const record = AV.Object.createWithoutData('blacklist_records', id)
    await record.destroy()
  }
}

// 退队记录相关操作
export const QuitService = {
  // 获取所有退队记录
  async getAllQuitRecords() {
    await ensureClass('quit_members')
    const query = new AV.Query('quit_members')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加退队记录
  async addQuitRecord(quitData: any) {
    await ensureClass('quit_members')
    
    // 检查是否已存在该成员的退队记录
    const query = new AV.Query('quit_members')
    query.equalTo('memberId', quitData.memberId)
    const existingRecord = await query.first()
    
    // 准备数据
    const data = { 
      ...quitData,
      quitType: quitData.quitType || quitData.type || '未知'
    }
    
    // 删除保留字段
    RESERVED_KEYS.forEach(key => delete data[key])
    
    if (existingRecord) {
      // 如果已存在记录，更新现有记录
      Object.keys(data).forEach(key => {
        existingRecord.set(key, data[key])
      })
      const result = await existingRecord.save()
      return result.toJSON()
    } else {
      // 如果不存在记录，创建新记录
      const QuitRecord = AV.Object.extend('quit_members')
      const record = new QuitRecord()
      Object.keys(data).forEach(key => {
        record.set(key, data[key])
      })
      const result = await record.save()
      return result.toJSON()
    }
  },

  // 删除退队记录
  async deleteQuitRecord(id: string) {
    await ensureClass('quit_members')
    const record = AV.Object.createWithoutData('quit_members', id)
    await record.destroy()
  },

  // 更新退队记录
  async updateQuitRecord(id: string, quitData: any) {
    await ensureClass('quit_members')
    const record = AV.Object.createWithoutData('quit_members', id)
    const data = { ...quitData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  }
}

// 违规退队记录相关操作
export const BlacklistQuitService = {
  // 获取所有违规退队记录
  async getAllBlacklistQuitRecords() {
    await ensureClass('blacklist_quit_members')
    const query = new AV.Query('blacklist_quit_members')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加违规退队记录
  async addBlacklistQuitRecord(recordData: any) {
    await ensureClass('blacklist_quit_members')
    const BlacklistQuitRecord = AV.Object.extend('blacklist_quit_members')
    const record = new BlacklistQuitRecord()
    const data = { ...recordData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  }
}

// 考核记录相关操作
export const AssessmentService = {
  // 获取所有考核记录
  async getAllAssessments() {
    await ensureClass('assessments')
    const query = new AV.Query('assessments')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加考核记录
  async addAssessment(assessmentData: any) {
    await ensureClass('assessments')
    const Assessment = AV.Object.extend('assessments')
    const assessment = new Assessment()
    const data = { ...assessmentData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      assessment.set(key, data[key])
    })
    const result = await assessment.save()
    return result.toJSON()
  },

  // 更新考核记录
  async updateAssessment(id: string, assessmentData: any) {
    await ensureClass('assessments')
    const assessment = AV.Object.createWithoutData('assessments', id)
    const data = { ...assessmentData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      assessment.set(key, data[key])
    })
    const result = await assessment.save()
    return result.toJSON()
  },

  // 删除考核记录
  async deleteAssessment(id: string) {
    await ensureClass('assessments')
    const assessment = AV.Object.createWithoutData('assessments', id)
    await assessment.destroy()
  }
}

// 黑点消除记录相关操作
export const BlacklistRemoveService = {
  // 获取所有黑点消除记录
  async getAllBlacklistRemoveRecords() {
    await ensureClass('blacklist_remove_records')
    const query = new AV.Query('blacklist_remove_records')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加黑点消除记录
  async addBlacklistRemoveRecord(recordData: any) {
    await ensureClass('blacklist_remove_records')
    const BlacklistRemoveRecord = AV.Object.extend('blacklist_remove_records')
    const record = new BlacklistRemoveRecord()
    const data = { ...recordData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  },

  // 更新黑点消除记录
  async updateBlacklistRemoveRecord(id: string, recordData: any) {
    await ensureClass('blacklist_remove_records')
    const record = AV.Object.createWithoutData('blacklist_remove_records', id)
    const data = { ...recordData }
    RESERVED_KEYS.forEach(key => delete data[key])
    Object.keys(data).forEach(key => {
      record.set(key, data[key])
    })
    const result = await record.save()
    return result.toJSON()
  },

  // 删除黑点消除记录
  async deleteBlacklistRemoveRecord(id: string) {
    await ensureClass('blacklist_remove_records')
    const record = AV.Object.createWithoutData('blacklist_remove_records', id)
    await record.destroy()
  }
}

export default {
  MemberService,
  LeaveService,
  BlacklistService,
  QuitService,
  BlacklistQuitService,
  AssessmentService,
  BlacklistRemoveService
} 