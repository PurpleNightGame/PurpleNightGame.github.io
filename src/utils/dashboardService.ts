import AV from 'leancloud-storage';
import { MemberStatus, MemberStage } from '../types/member';

// 数据缓存机制
interface StatsCache {
  data: any;
  timestamp: number;
  expiresIn: number; // 毫秒
}

let statsCache: StatsCache | null = null;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5分钟缓存过期

// Dashboard数据服务
export const dashboardService = {
  // 获取成员相关统计数据（合并查询）
  getMemberStats: async (): Promise<{
    memberCount: number;
    activeMemberCount: number;
    trainedMemberCount: number;
    onLeaveMemberCount: number;
  }> => {
    try {
      // 使用聚合查询减少请求次数
      // 1. 获取总成员数
      const countQuery = new AV.Query('Member');
      const totalCount = await countQuery.count();
      
      // 2. 获取成员状态分布
      const memberByStatus: Record<string, number> = {};
      
      // 获取正常状态成员数
      const normalQuery = new AV.Query('Member');
      normalQuery.equalTo('status', MemberStatus.NORMAL);
      memberByStatus[MemberStatus.NORMAL] = await normalQuery.count();
      
      // 获取请假成员数
      const leaveQuery = new AV.Query('Member');
      leaveQuery.equalTo('status', MemberStatus.ON_LEAVE);
      memberByStatus[MemberStatus.ON_LEAVE] = await leaveQuery.count();
      
      // 3. 获取已训成员数
      const trainedQuery = new AV.Query('Member');
      trainedQuery.notEqualTo('stage', MemberStage.NO_TRAINING);
      const trainedCount = await trainedQuery.count();

      return {
        memberCount: totalCount,
        activeMemberCount: memberByStatus[MemberStatus.NORMAL] || 0,
        trainedMemberCount: trainedCount,
        onLeaveMemberCount: memberByStatus[MemberStatus.ON_LEAVE] || 0
      };
    } catch (error) {
      console.error('获取成员统计数据失败:', error);
      return {
        memberCount: 0,
        activeMemberCount: 0,
        trainedMemberCount: 0,
        onLeaveMemberCount: 0
      };
    }
  },

  // 获取记录相关统计数据（合并查询）
  getRecordsStats: async (): Promise<{
    currentMonthExamCount: number;
    currentMonthBlackpointCount: number;
    totalExamCount: number;
    totalBlackpointCount: number;
    activeLeaveCount: number;
    pendingQuitRequestCount: number;
    pendingStayRequestCount: number;
  }> => {
    try {
      // 设置当前月份的时间范围
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // 1. 获取本月考核记录数
      const examMonthQuery = new AV.Query('ExamRecord');
      examMonthQuery.greaterThanOrEqualTo('date', startOfMonth);
      examMonthQuery.lessThanOrEqualTo('date', endOfMonth);
      const examMonthCount = await examMonthQuery.count();

      // 2. 获取本月黑点记录数
      const blackpointMonthQuery = new AV.Query('BlackpointRecord');
      blackpointMonthQuery.greaterThanOrEqualTo('date', startOfMonth);
      blackpointMonthQuery.lessThanOrEqualTo('date', endOfMonth);
      const blackpointMonthCount = await blackpointMonthQuery.count();
      
      // 3. 获取考核总数
      const examTotalQuery = new AV.Query('ExamRecord');
      const examTotalCount = await examTotalQuery.count();
      
      // 4. 获取黑点总数
      const blackpointTotalQuery = new AV.Query('BlackpointRecord');
      const blackpointTotalCount = await blackpointTotalQuery.count();

      // 5. 获取活跃请假记录数
      const leaveQuery = new AV.Query('LeaveRecord');
      leaveQuery.equalTo('status', 'active');
      leaveQuery.greaterThan('endDate', now);
      const leaveCount = await leaveQuery.count();

      // 6. 获取待审批退队申请数
      const quitQuery = new AV.Query('QuitRecord');
      quitQuery.equalTo('isPending', true);
      const quitCount = await quitQuery.count();

      // 7. 获取待审批留队申请数
      const stayQuery = new AV.Query('StayRecord');
      stayQuery.equalTo('isPending', true);
      const stayCount = await stayQuery.count();

      return {
        currentMonthExamCount: examMonthCount,
        currentMonthBlackpointCount: blackpointMonthCount,
        totalExamCount: examTotalCount,
        totalBlackpointCount: blackpointTotalCount,
        activeLeaveCount: leaveCount,
        pendingQuitRequestCount: quitCount,
        pendingStayRequestCount: stayCount
      };
    } catch (error) {
      console.error('获取记录统计数据失败:', error);
      return {
        currentMonthExamCount: 0,
        currentMonthBlackpointCount: 0,
        totalExamCount: 0,
        totalBlackpointCount: 0,
        activeLeaveCount: 0,
        pendingQuitRequestCount: 0,
        pendingStayRequestCount: 0
      };
    }
  },

  // 获取所有统计数据，使用缓存减少请求
  getAllStats: async (forceRefresh = false) => {
    // 检查缓存是否有效
    const now = Date.now();
    if (
      !forceRefresh && 
      statsCache && 
      statsCache.data && 
      now - statsCache.timestamp < statsCache.expiresIn
    ) {
      console.log('使用缓存数据，无需发送API请求');
      return statsCache.data;
    }

    try {
      // 通过两个合并查询获取所有需要的数据，减少API请求次数
      const [memberStats, recordsStats] = await Promise.all([
        dashboardService.getMemberStats(),
        dashboardService.getRecordsStats()
      ]);
      
      // 合并结果
      const stats = {
        ...memberStats,
        ...recordsStats
      };
      
      // 更新缓存
      statsCache = {
        data: stats,
        timestamp: now,
        expiresIn: CACHE_EXPIRY
      };
      
      return stats;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      
      // 缓存失效但出错时，如果有旧缓存则使用旧缓存
      if (statsCache && statsCache.data) {
        console.log('API请求失败，使用过期缓存数据');
        return statsCache.data;
      }
      
      // 没有缓存时返回默认值
      return {
        memberCount: 0,
        activeMemberCount: 0,
        trainedMemberCount: 0,
        onLeaveMemberCount: 0,
        currentMonthExamCount: 0,
        currentMonthBlackpointCount: 0,
        totalExamCount: 0,
        totalBlackpointCount: 0,
        activeLeaveCount: 0,
        pendingQuitRequestCount: 0,
        pendingStayRequestCount: 0
      };
    }
  },
  
  // 清除缓存
  clearCache: () => {
    statsCache = null;
    console.log('统计数据缓存已清除');
  }
}; 