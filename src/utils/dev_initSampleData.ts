import AV from 'leancloud-storage';
import { MemberStage, MemberStatus, ExamStatus } from '../types/member';

/**
 * 添加示例数据到LeanCloud
 * 这个函数用于在开发环境中快速添加测试数据
 */
export const initSampleData = async (): Promise<void> => {
  try {
    console.log('开始初始化示例数据...');
    
    // 清除旧数据（可选，通常在开发环境使用）
    // await clearAllData();
    
    // 添加示例成员
    const memberIds = await addSampleMembers();
    
    // 添加示例黑点记录
    await addSampleBlackpoints(memberIds);
    
    // 基于成员添加示例考核记录
    await addSampleExams(memberIds);
    
    // 添加示例请假记录
    await addSampleLeaveRecords(memberIds);
    
    // 添加示例退队记录
    await addSampleQuitRecords(memberIds);
    
    // 添加示例留队申请
    await addSampleStayRecords(memberIds);
    
    console.log('示例数据初始化完成');
  } catch (error) {
    console.error('初始化示例数据失败:', error);
  }
};

/**
 * 添加示例成员数据
 * @returns 返回创建的成员ID数组
 */
const addSampleMembers = async (): Promise<string[]> => {
  try {
    // 检查是否已有示例成员
    const query = new AV.Query('Member');
    const existingCount = await query.count();
    
    if (existingCount > 1) {
      console.log(`成员表已有 ${existingCount} 条记录，跳过添加示例成员`);
      
      // 返回现有成员ID，过滤掉可能的undefined值
      const existingMembers = await query.find();
      return existingMembers.map(member => member.id).filter((id): id is string => id !== undefined);
    }
    
    console.log('正在添加示例成员...');
    const memberData = [
      {
        nickname: '张三',
        qqNumber: '123456789',
        gameId: 'player123',
        joinDate: new Date(2023, 0, 15), // 2023年1月15日
        stage: MemberStage.PURPLE_NIGHT,
        status: MemberStatus.NORMAL,
        blackpointCount: 0,
        isTeacher: true
      },
      {
        nickname: '李四',
        qqNumber: '987654321',
        gameId: 'player456',
        joinDate: new Date(2023, 2, 5), // 2023年3月5日
        stage: MemberStage.NEW_TRAINING_2,
        status: MemberStatus.NORMAL,
        blackpointCount: 1,
        isTeacher: false
      },
      {
        nickname: '王五',
        qqNumber: '555555555',
        gameId: 'player789',
        joinDate: new Date(2023, 4, 20), // 2023年5月20日
        stage: MemberStage.NEW_TRAINING_INITIAL,
        status: MemberStatus.NORMAL,
        blackpointCount: 2,
        isTeacher: false
      },
      {
        nickname: '赵六',
        qqNumber: '666666666',
        gameId: 'player666',
        joinDate: new Date(2023, 6, 10), // 2023年7月10日
        stage: MemberStage.NO_TRAINING,
        status: MemberStatus.ON_LEAVE,
        blackpointCount: 0,
        isTeacher: false
      }
    ];
    
    const memberIds: string[] = [];
    const Member = AV.Object.extend('Member');
    
    for (const data of memberData) {
      const member = new Member();
      
      // 设置成员属性
      Object.entries(data).forEach(([key, value]) => {
        member.set(key, value);
      });
      
      // 保存到LeanCloud
      const savedMember = await member.save();
      memberIds.push(savedMember.id);
    }
    
    console.log(`已添加 ${memberIds.length} 条示例成员数据`);
    return memberIds;
  } catch (error) {
    console.error('添加示例成员失败:', error);
    throw error;
  }
};

/**
 * 添加示例黑点记录
 * @param memberIds 成员ID数组
 */
const addSampleBlackpoints = async (memberIds: string[]): Promise<void> => {
  try {
    // 检查是否已有黑点记录
    const query = new AV.Query('BlackpointRecord');
    const count = await query.count();
    
    if (count > 0) {
      console.log(`黑点记录表已有 ${count} 条记录，跳过添加示例数据`);
      return;
    }
    
    console.log('正在添加示例黑点记录...');
    const blackpointData = [
      {
        memberId: memberIds[1], // 李四
        reason: '未按时参加团队训练',
        date: new Date(2023, 8, 5), // 2023年9月5日
        isActive: true
      },
      {
        memberId: memberIds[2], // 王五
        reason: '连续两次未完成周任务',
        date: new Date(2023, 7, 15), // 2023年8月15日
        isActive: true
      },
      {
        memberId: memberIds[2], // 王五
        reason: '违反团队规章制度',
        date: new Date(2023, 6, 25), // 2023年7月25日
        isActive: true
      },
      {
        memberId: memberIds[0], // 张三
        reason: '未能及时响应紧急集合通知',
        date: new Date(2023, 5, 10), // 2023年6月10日
        isActive: false // 已过期
      }
    ];
    
    const BlackpointRecord = AV.Object.extend('BlackpointRecord');
    
    for (const data of blackpointData) {
      const record = new BlackpointRecord();
      
      // 设置记录属性
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 保存到LeanCloud
      await record.save();
    }
    
    console.log(`已添加 ${blackpointData.length} 条示例黑点记录`);
  } catch (error) {
    console.error('添加示例黑点记录失败:', error);
    throw error;
  }
};

/**
 * 添加示例考核记录
 * @param memberIds 成员ID数组
 */
const addSampleExams = async (memberIds: string[]): Promise<void> => {
  try {
    // 检查是否已有考核记录
    const query = new AV.Query('ExamRecord');
    const count = await query.count();
    
    if (count > 0) {
      console.log(`考核记录表已有 ${count} 条记录，跳过添加示例数据`);
      return;
    }
    
    console.log('正在添加示例考核记录...');
    
    // 获取成员信息用于设置memberName
    const memberQuery = new AV.Query('Member');
    const members = await memberQuery.find();
    const memberMap = new Map<string, string>();
    
    members.forEach(member => {
      const id = member.id;
      const nickname = member.get('nickname');
      if (id && nickname) {
        memberMap.set(id, nickname);
      }
    });
    
    const examData = [
      {
        memberId: memberIds[0], // 张三
        memberName: memberMap.get(memberIds[0]) || '未知成员',
        mapName: '尖兵演习场',
        status: ExamStatus.PASSED,
        passDate: new Date(2023, 1, 20), // 2023年2月20日
        score: 92,
        comment: '表现优秀，战术意识良好，射击精准'
      },
      {
        memberId: memberIds[1], // 李四
        memberName: memberMap.get(memberIds[1]) || '未知成员',
        mapName: '荒漠训练场',
        status: ExamStatus.PASSED,
        passDate: new Date(2023, 3, 15), // 2023年4月15日
        score: 85,
        comment: '完成任务要求，团队配合有待提高'
      },
      {
        memberId: memberIds[2], // 王五
        memberName: memberMap.get(memberIds[2]) || '未知成员',
        mapName: '城市作战区',
        status: ExamStatus.FAILED,
        passDate: null,
        score: 60,
        comment: '未能达到通过标准，需要加强个人能力训练'
      },
      {
        memberId: memberIds[3], // 赵六
        memberName: memberMap.get(memberIds[3]) || '未知成员',
        mapName: '丛林战场',
        status: ExamStatus.IN_PROGRESS,
        passDate: null,
        score: null,
        comment: '考核进行中，等待最终评定'
      }
    ];
    
    const ExamRecord = AV.Object.extend('ExamRecord');
    
    for (const data of examData) {
      const record = new ExamRecord();
      
      // 设置记录属性
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 保存到LeanCloud
      await record.save();
    }
    
    console.log(`已添加 ${examData.length} 条示例考核记录`);
  } catch (error) {
    console.error('添加示例考核记录失败:', error);
    throw error;
  }
};

/**
 * 添加示例请假记录
 * @param memberIds 成员ID数组
 */
const addSampleLeaveRecords = async (memberIds: string[]): Promise<void> => {
  try {
    // 检查是否已有请假记录
    const query = new AV.Query('LeaveRecord');
    const count = await query.count();
    
    if (count > 0) {
      console.log(`请假记录表已有 ${count} 条记录，跳过添加示例数据`);
      return;
    }
    
    console.log('正在添加示例请假记录...');
    const leaveData = [
      {
        memberId: memberIds[3], // 赵六
        startDate: new Date(2023, 9, 1), // 2023年10月1日
        endDate: new Date(2023, 9, 15), // 2023年10月15日
        reason: '出国旅行，无法参加训练',
        status: 'active'
      },
      {
        memberId: memberIds[1], // 李四
        startDate: new Date(2023, 7, 10), // 2023年8月10日
        endDate: new Date(2023, 7, 20), // 2023年8月20日
        reason: '学业繁忙，需要暂时请假',
        status: 'ended'
      },
      {
        memberId: memberIds[0], // 张三
        startDate: new Date(2023, 6, 5), // 2023年7月5日
        endDate: new Date(2023, 6, 10), // 2023年7月10日
        reason: '家中有事，需短期请假',
        status: 'ended'
      },
      {
        memberId: memberIds[2], // 王五
        startDate: new Date(2023, 8, 25), // 2023年9月25日
        endDate: new Date(2023, 9, 5), // 2023年10月5日
        reason: '设备维修，暂时无法参与活动',
        status: 'cancelled'
      }
    ];
    
    const LeaveRecord = AV.Object.extend('LeaveRecord');
    
    for (const data of leaveData) {
      const record = new LeaveRecord();
      
      // 设置记录属性
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 保存到LeanCloud
      await record.save();
    }
    
    console.log(`已添加 ${leaveData.length} 条示例请假记录`);
  } catch (error) {
    console.error('添加示例请假记录失败:', error);
    throw error;
  }
};

/**
 * 添加示例退队记录
 * @param memberIds 成员ID数组
 */
const addSampleQuitRecords = async (memberIds: string[]): Promise<void> => {
  try {
    // 检查是否已有退队记录
    const query = new AV.Query('QuitRecord');
    const count = await query.count();
    
    if (count > 0) {
      console.log(`退队记录表已有 ${count} 条记录，跳过添加示例数据`);
      return;
    }
    
    console.log('正在添加示例退队记录...');
    
    // 获取成员信息用于设置memberName
    const memberQuery = new AV.Query('Member');
    const members = await memberQuery.find();
    const memberMap = new Map<string, {nickname: string, qqNumber: string}>();
    
    members.forEach(member => {
      const id = member.id;
      const nickname = member.get('nickname');
      const qqNumber = member.get('qqNumber');
      if (id && nickname && qqNumber) {
        memberMap.set(id, {
          nickname,
          qqNumber
        });
      }
    });
    
    const quitData = [
      {
        memberId: memberIds[2], // 王五
        memberName: memberMap.get(memberIds[2])?.nickname || '未知成员',
        memberQQ: memberMap.get(memberIds[2])?.qqNumber || '未知',
        reason: '个人原因申请退队',
        date: new Date(2023, 8, 28), // 2023年9月28日
        isAutomatic: false,
        source: 'manual',
        isPending: true,
        isApproved: false,
        adminRemark: ''
      },
      {
        memberId: '临时成员ID1', // 模拟一个已退队的成员
        memberName: '陈七',
        memberQQ: '777777777',
        reason: '连续三个月未参与团队活动',
        date: new Date(2023, 7, 15), // 2023年8月15日
        isAutomatic: true,
        source: 'untrained',
        isPending: false,
        isApproved: true,
        approvedAt: new Date(2023, 7, 20), // 2023年8月20日
        adminRemark: '长期不活跃，系统自动退队'
      },
      {
        memberId: '临时成员ID2', // 模拟一个已退队的成员
        memberName: '周八',
        memberQQ: '888888888',
        reason: '黑点累计达到4个',
        date: new Date(2023, 6, 10), // 2023年7月10日
        isAutomatic: true,
        source: 'blackpoint',
        isPending: false,
        isApproved: true,
        approvedAt: new Date(2023, 6, 12), // 2023年7月12日
        adminRemark: '因多次违反团队规定，批准退队'
      },
      {
        memberId: memberIds[1], // 李四
        memberName: memberMap.get(memberIds[1])?.nickname || '未知成员',
        memberQQ: memberMap.get(memberIds[1])?.qqNumber || '未知',
        reason: '个人时间无法配合团队活动',
        date: new Date(), // 今天
        isAutomatic: false,
        source: 'manual',
        isPending: true,
        isApproved: false,
        adminRemark: ''
      }
    ];
    
    const QuitRecord = AV.Object.extend('QuitRecord');
    
    for (const data of quitData) {
      const record = new QuitRecord();
      
      // 设置记录属性
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 保存到LeanCloud
      await record.save();
    }
    
    console.log(`已添加 ${quitData.length} 条示例退队记录`);
  } catch (error) {
    console.error('添加示例退队记录失败:', error);
    throw error;
  }
};

// 添加示例留队申请
const addSampleStayRecords = async (memberIds: string[]): Promise<void> => {
  try {
    // 检查是否已有留队记录
    const query = new AV.Query('StayRecord');
    const count = await query.count();
    
    if (count > 0) {
      console.log(`留队记录表已有 ${count} 条记录，跳过添加示例数据`);
      return;
    }
    
    // 获取成员信息，用于设置显示名称等
    const memberQuery = new AV.Query('Member');
    const members = await memberQuery.find();
    const memberMap = new Map();
    
    members.forEach(member => {
      memberMap.set(member.id, {
        nickname: member.get('nickname'),
        qqNumber: member.get('qqNumber')
      });
    });
    
    console.log('正在添加示例留队申请...');
    
    // 创建三条示例留队申请
    const stayData = [
      {
        memberId: memberIds[0], // 张三
        reason: '因工作原因，短期无法参加新训',
        date: new Date(2023, 9, 15), // 2023年10月15日
        isPending: true,
        isApproved: false,
        adminRemark: '',
        requestedValidUntil: new Date(2023, 10, 15) // 2023年11月15日
      },
      {
        memberId: memberIds[3] || memberIds[0], // 另一个成员，如果不存在则使用张三
        reason: '最近时间安排紧张，请求临时留队一个月',
        date: new Date(2023, 9, 10), // 2023年10月10日
        isPending: false,
        isApproved: true,
        adminRemark: '批准留队',
        approvedAt: new Date(2023, 9, 12), // 2023年10月12日
        requestedValidUntil: new Date(2023, 10, 10), // 2023年11月10日
        validUntil: new Date(2023, 10, 10) // 2023年11月10日
      },
      {
        memberId: memberIds[4] || memberIds[0], // 另一个成员，如果不存在则使用张三
        reason: '最近身体不适，需要休息一段时间',
        date: new Date(2023, 9, 5), // 2023年10月5日
        isPending: false,
        isApproved: false,
        adminRemark: '缺席时间过长，建议退队后重新加入',
        approvedAt: new Date(2023, 9, 6), // 2023年10月6日
        requestedValidUntil: new Date(2023, 11, 5) // 2023年12月5日
      }
    ];
    
    const StayRecord = AV.Object.extend('StayRecord');
    
    for (const data of stayData) {
      const record = new StayRecord();
      
      // 设置记录属性
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      await record.save();
      console.log(`创建留队申请: ${data.reason ? data.reason.substring(0, 20) : '未知原因'}...`);
    }
    
    console.log(`已添加 ${stayData.length} 条示例留队申请`);
  } catch (error) {
    console.error('创建示例留队申请失败:', error);
    throw error;
  }
}; 