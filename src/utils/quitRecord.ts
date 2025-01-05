export const addQuitRecord = (member: Member, quitReason: string) => {
  try {
    const quitMembers = JSON.parse(localStorage.getItem('quit_members') || '[]')
    // 检查是否已存在相同记录
    const exists = quitMembers.some((m: QuitMember) => m.id === member.id)
    if (!exists) {
      const quitMember: QuitMember = {
        ...member,
        quitReason
      }
      quitMembers.unshift(quitMember)
      localStorage.setItem('quit_members', JSON.stringify(quitMembers))
    }
  } catch (e) {
    console.error('Failed to add quit record:', e)
  }
}

export const initQuitRecords = () => {
  try {
    const members = JSON.parse(localStorage.getItem('training_members') || '[]')
    const quitMembers = members.filter(member => 
      member.status === '超时退队' || 
      member.status === '未训退队' || 
      member.status === '违规退队'
    )
    
    quitMembers.forEach(member => {
      addQuitRecord(member, member.status)
    })
  } catch (e) {
    console.error('Failed to init quit records:', e)
  }
} 