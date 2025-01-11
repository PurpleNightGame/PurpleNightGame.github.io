// 统一的成员状态计算函数
export const calculateMemberStatus = (member: any, blacklistRecords: any[], leaveRecords: any[]) => {
  // 检查是否处于请假状态（包括请假中和等待销假）
  const isOnLeave = leaveRecords.some(record => 
    record.memberId === member.objectId && 
    (record.status === '请假中' || record.status === '等待销假')
  )

  // 检查是否有4个或以上黑点
  const blacklistCount = blacklistRecords.filter(record => 
    record.memberId === member.objectId && 
    record.status === '有效'
  ).length

  // 如果有4个或以上黑点，直接返回违规退队（对所有阶段都生效）
  if (blacklistCount >= 4) {
    return '违规退队'
  }

  // 如果成员已通过考核或是紫夜阶段，且没有违规退队，返回正常状态
  if (member.passDate || member.stage === '紫夜') {
    return '正常'
  }

  // 如果成员处于请假状态或留队申请已通过，返回正常
  if (isOnLeave || member.leaveRequest === '通过') {
    return '正常'
  }

  // 如果成员是未新训且加入超过3天，且留队申请未通过，返回未训退队
  if (member.stage === '未新训') {
    const joinDate = new Date(member.joinTime)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays > 3 && member.leaveRequest !== '通过') {
      return '未训退队'
    }
    return '催促参训'
  }

  // 检查最后训练日期
  if (member.lastTrainingDate && member.lastTrainingDate !== 'null') {
    const lastDate = new Date(member.lastTrainingDate)
    const now = new Date()
    const trainingDiffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (trainingDiffDays >= 10 && member.leaveRequest !== '通过') {
      return '超时退队'
    } else if (trainingDiffDays >= 7 && member.leaveRequest !== '通过') {
      return '催促参训'
    }
  }

  return '正常'
} 