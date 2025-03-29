// 成员阶段枚举
export enum MemberStage {
  PURPLE_NIGHT = '紫夜', // 不可选择，只有通过考核后自动变更
  NEW_TRAINING_CANDIDATE = '新训准考',
  NEW_TRAINING_3 = '新训3期',
  NEW_TRAINING_2 = '新训2期',
  NEW_TRAINING_1 = '新训1期',
  NEW_TRAINING_INITIAL = '新训初期',
  NO_TRAINING = '未新训', // 默认值
}

// 成员状态枚举
export enum MemberStatus {
  NORMAL = '正常', // 默认值
  ON_LEAVE = '请假中',
  QUIT = '已退队',
}

// 成员接口定义
export interface Member {
  id: string; // 唯一标识，系统生成
  nickname: string; // 昵称
  qqNumber: string; // QQ号
  gameId?: string; // 游戏ID，选填
  joinDate: Date; // 加入时间
  stage: MemberStage; // 阶段
  status: MemberStatus; // 状态
  lastTrainingDate?: Date; // 最后一次新训日期
  blackpointCount: number; // 黑点数量
  isTeacher: boolean; // 是否可以教授尖兵课程
  countdownOverride?: number | null; // 未训名单倒计时覆盖值，用于自定义退队倒计时
  reminderCountdownOverride?: number | null; // 催促名单倒计时覆盖值，用于自定义催促倒计时
  remark?: string; // 备注信息
  createdAt?: Date; // 创建时间
}

// 黑点记录接口
export interface BlackpointRecord {
  id: string; // 唯一标识
  memberId: string; // 成员ID
  reason: string; // 黑点原因
  date: Date; // 记录日期
  isActive: boolean; // 是否有效（一个月后自动消除）
  registrar?: string; // 登记人
}

// 请假记录接口
export interface LeaveRecord {
  id: string; // 唯一标识
  memberId: string; // 成员ID
  startDate: Date; // 开始日期
  endDate: Date; // 结束日期
  reason: string; // 请假原因
  status: 'active' | 'ended' | 'cancelled'; // 请假状态
}

// 考核状态枚举
export enum ExamStatus {
  PASSED = '通过',
  FAILED = '未通过',
  IN_PROGRESS = '进行中',
}

// 考核记录接口
export interface ExamRecord {
  id: string; // 唯一标识
  memberId: string; // 成员ID
  mapName: string; // 考核地图
  status: ExamStatus; // 考核状态
  passDate?: Date; // 通过日期
  score?: number; // 考核评分
  comment?: string; // 考核评价
}

// 退队记录接口
export interface QuitRecord {
  id: string;
  memberId: string;
  reason: string;
  date: Date;
  isAutomatic: boolean;
  source: string;
  isPending: boolean;
  isApproved?: boolean;
  adminRemark?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export interface StayRecord {
  id: string;
  memberId: string;
  reason: string;
  date: Date;
  isPending: boolean;
  isApproved?: boolean;
  adminRemark?: string;
  createdAt: Date;
  approvedAt?: Date;
  requestedValidUntil?: Date;
  validUntil?: Date;
} 