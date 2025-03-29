import AV from 'leancloud-storage';
import { MemberStage, MemberStatus } from '../types/member';

/**
 * 初始化LeanCloud表格结构
 * 在LeanCloud中，表结构不需要预先定义，只需插入第一条数据
 * 这个函数会创建必要的表结构和示例数据
 */
export const initLeanCloudTables = async (): Promise<void> => {
  try {
    console.log('开始初始化LeanCloud表格...');
    
    // 初始化Member表
    await initMemberTable();
    
    // 初始化BlackpointRecord表
    await initBlackpointRecordTable();
    
    // 初始化LeaveRecord表
    await initLeaveRecordTable();
    
    // 初始化ExamRecord表
    await initExamRecordTable();
    
    // 初始化QuitRecord表
    await initQuitRecordTable();
    
    // 初始化StayRecord表
    await initStayRecordTable();

    console.log('所有表格初始化完成！');
  } catch (error) {
    console.error('初始化表格失败:', error);
    throw error;
  }
};

/**
 * 初始化成员表
 */
const initMemberTable = async (): Promise<void> => {
  try {
    // 检查Member表是否已存在
    const query = new AV.Query('Member');
    try {
      const count = await query.count();
      console.log(`Member表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例成员数据
    console.log('正在创建Member表...');
    const Member = AV.Object.extend('Member');
    const member = new Member();
    
    // 设置成员属性
    member.set('nickname', '示例成员');
    member.set('qqNumber', '12345678');
    member.set('gameId', 'example_player');
    member.set('joinDate', new Date());
    member.set('stage', MemberStage.NO_TRAINING);
    member.set('status', MemberStatus.NORMAL);
    member.set('blackpointCount', 0);
    member.set('isTeacher', false);
    member.set('remark', '这是一个示例成员，用于初始化表结构');
    
    // 保存到LeanCloud
    await member.save();
    console.log('Member表创建成功');
    
    // 删除示例数据，保持表结构干净
    await member.destroy();
    console.log('已删除示例数据，Member表准备就绪');
  } catch (error) {
    console.error('初始化Member表失败:', error);
    throw error;
  }
};

/**
 * 初始化黑点记录表
 */
const initBlackpointRecordTable = async (): Promise<void> => {
  try {
    // 检查BlackpointRecord表是否已存在
    const query = new AV.Query('BlackpointRecord');
    try {
      const count = await query.count();
      console.log(`BlackpointRecord表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例黑点记录
    console.log('正在创建BlackpointRecord表...');
    const BlackpointRecord = AV.Object.extend('BlackpointRecord');
    const record = new BlackpointRecord();
    
    // 设置记录属性
    record.set('memberId', 'example_member_id');
    record.set('reason', '示例黑点原因');
    record.set('date', new Date());
    record.set('operatorId', 'example_operator_id');
    
    // 保存到LeanCloud
    await record.save();
    console.log('BlackpointRecord表创建成功');
    
    // 删除示例数据
    await record.destroy();
    console.log('已删除示例数据，BlackpointRecord表准备就绪');
  } catch (error) {
    console.error('初始化BlackpointRecord表失败:', error);
    throw error;
  }
};

/**
 * 初始化请假记录表
 */
const initLeaveRecordTable = async (): Promise<void> => {
  try {
    // 检查LeaveRecord表是否已存在
    const query = new AV.Query('LeaveRecord');
    try {
      const count = await query.count();
      console.log(`LeaveRecord表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例请假记录
    console.log('正在创建LeaveRecord表...');
    const LeaveRecord = AV.Object.extend('LeaveRecord');
    const record = new LeaveRecord();
    
    // 设置记录属性
    record.set('memberId', 'example_member_id');
    record.set('reason', '示例请假原因');
    record.set('startDate', new Date());
    record.set('endDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7天后
    record.set('status', '已批准');
    record.set('approvedBy', 'example_approver_id');
    
    // 保存到LeanCloud
    await record.save();
    console.log('LeaveRecord表创建成功');
    
    // 删除示例数据
    await record.destroy();
    console.log('已删除示例数据，LeaveRecord表准备就绪');
  } catch (error) {
    console.error('初始化LeaveRecord表失败:', error);
    throw error;
  }
};

/**
 * 初始化考核记录表
 */
const initExamRecordTable = async (): Promise<void> => {
  try {
    // 检查ExamRecord表是否已存在
    const query = new AV.Query('ExamRecord');
    try {
      const count = await query.count();
      console.log(`ExamRecord表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例考核记录
    console.log('正在创建ExamRecord表...');
    const ExamRecord = AV.Object.extend('ExamRecord');
    const record = new ExamRecord();
    
    // 设置记录属性
    record.set('memberId', 'example_member_id');
    record.set('examDate', new Date());
    record.set('examType', '晋级考核');
    record.set('score', 85);
    record.set('result', '通过');
    record.set('examiner', 'example_examiner_id');
    record.set('comments', '表现良好');
    
    // 保存到LeanCloud
    await record.save();
    console.log('ExamRecord表创建成功');
    
    // 删除示例数据
    await record.destroy();
    console.log('已删除示例数据，ExamRecord表准备就绪');
  } catch (error) {
    console.error('初始化ExamRecord表失败:', error);
    throw error;
  }
};

/**
 * 初始化退队记录表
 */
const initQuitRecordTable = async (): Promise<void> => {
  try {
    // 检查QuitRecord表是否已存在
    const query = new AV.Query('QuitRecord');
    try {
      const count = await query.count();
      console.log(`QuitRecord表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例退队记录
    console.log('正在创建QuitRecord表...');
    const QuitRecord = AV.Object.extend('QuitRecord');
    const record = new QuitRecord();
    
    // 设置记录属性
    record.set('memberId', 'example_member_id');
    record.set('reason', '示例退队原因');
    record.set('date', new Date());
    record.set('isAutomatic', false);
    record.set('source', 'manual');
    record.set('isPending', false);
    record.set('isApproved', true);
    record.set('approvedAt', new Date());
    record.set('adminRemark', '示例管理员备注');
    
    // 保存到LeanCloud
    await record.save();
    console.log('QuitRecord表创建成功');
    
    // 删除示例数据
    await record.destroy();
    console.log('已删除示例数据，QuitRecord表准备就绪');
  } catch (error) {
    console.error('初始化QuitRecord表失败:', error);
    throw error;
  }
};

/**
 * 初始化留队申请表
 */
const initStayRecordTable = async (): Promise<void> => {
  try {
    // 检查StayRecord表是否已存在
    const query = new AV.Query('StayRecord');
    try {
      const count = await query.count();
      console.log(`StayRecord表已存在，包含 ${count} 条记录`);
      return; // 表已存在，无需初始化
    } catch (error: any) {
      // 如果是表不存在的错误（错误码101），则继续创建表
      if (error.code !== 101 && !error.message.includes("Class or object doesn't exists")) {
        throw error; // 其他错误则抛出
      }
    }

    // 创建示例留队申请记录
    console.log('正在创建StayRecord表...');
    const StayRecord = AV.Object.extend('StayRecord');
    const record = new StayRecord();
    
    // 设置记录属性
    record.set('memberId', 'example_member_id');
    record.set('reason', '示例留队原因');
    record.set('date', new Date());
    record.set('isPending', true);
    record.set('isApproved', false);
    record.set('adminRemark', '');
    record.set('requestedValidUntil', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30天后
    
    // 保存到LeanCloud
    await record.save();
    console.log('StayRecord表创建成功');
    
    // 删除示例数据
    await record.destroy();
    console.log('已删除示例数据，StayRecord表准备就绪');
  } catch (error) {
    console.error('初始化StayRecord表失败:', error);
    throw error;
  }
}; 