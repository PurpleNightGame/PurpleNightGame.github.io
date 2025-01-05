import AV from 'leancloud-storage'
import { ensureClass } from './leancloud-init'

// 成员相关操作
export const MemberService = {
  // 获取所有成员
  async getAllMembers() {
    await ensureClass('training_members')
    const query = new AV.Query('training_members')
    const results = await query.find()
    return results.map(member => member.toJSON())
  },

  // 添加成员
  async addMember(memberData: any) {
    await ensureClass('training_members')
    const Member = AV.Object.extend('training_members')
    const member = new Member()
    Object.keys(memberData).forEach(key => {
      member.set(key, memberData[key])
    })
    const result = await member.save()
    return result.toJSON()
  },

  // 更新成员
  async updateMember(id: string, memberData: any) {
    await ensureClass('training_members')
    const member = AV.Object.createWithoutData('training_members', id)
    Object.keys(memberData).forEach(key => {
      member.set(key, memberData[key])
    })
    const result = await member.save()
    return result.toJSON()
  },

  // 删除成员
  async deleteMember(id: string) {
    await ensureClass('training_members')
    const member = AV.Object.createWithoutData('training_members', id)
    await member.destroy()
  }
}

// 请假记录相关操作
export const LeaveService = {
  // 获取所有请假记录
  async getAllLeaveRecords() {
    await ensureClass('leave_records')
    const query = new AV.Query('leave_records')
    const results = await query.find()
    return results.map(record => record.toJSON())
  },

  // 添加请假记录
  async addLeaveRecord(leaveData: any) {
    await ensureClass('leave_records')
    const LeaveRecord = AV.Object.extend('leave_records')
    const record = new LeaveRecord()
    Object.keys(leaveData).forEach(key => {
      record.set(key, leaveData[key])
    })
    const result = await record.save()
    return result.toJSON()
  },

  // 更新请假记录
  async updateLeaveRecord(id: string, leaveData: any) {
    await ensureClass('leave_records')
    const record = AV.Object.createWithoutData('leave_records', id)
    Object.keys(leaveData).forEach(key => {
      record.set(key, leaveData[key])
    })
    const result = await record.save()
    return result.toJSON()
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

  // 更新黑点记录
  async updateBlacklistRecord(id: string, recordData: any) {
    await ensureClass('blacklist_records')
    const record = AV.Object.createWithoutData('blacklist_records', id)
    Object.keys(recordData).forEach(key => {
      record.set(key, recordData[key])
    })
    const result = await record.save()
    return result.toJSON()
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
    const QuitRecord = AV.Object.extend('quit_members')
    const record = new QuitRecord()
    Object.keys(quitData).forEach(key => {
      record.set(key, quitData[key])
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
    Object.keys(recordData).forEach(key => {
      record.set(key, recordData[key])
    })
    const result = await record.save()
    return result.toJSON()
  }
}

export default {
  MemberService,
  LeaveService,
  BlacklistService,
  QuitService,
  BlacklistQuitService
} 