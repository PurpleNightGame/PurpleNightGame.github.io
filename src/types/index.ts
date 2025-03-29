// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginForm {
  username: string;
  password: string;
  remember?: boolean;
}

// 成员相关类型
export interface Member {
  id: string;
  name: string;         // 游戏角色名
  realName?: string;    // 真实姓名（可选）
  level: number;        // 游戏等级
  role: string;         // 角色职业
  joinDate: Date;       // 加入日期
  status: MemberStatus; // 成员状态
  contribution: number; // 贡献度
  contact?: string;     // 联系方式（可选）
  notes?: string;       // 备注（可选）
  createdAt: Date;
  updatedAt: Date;
}

// 成员状态枚举
export enum MemberStatus {
  ACTIVE = 'active',       // 活跃
  INACTIVE = 'inactive',   // 不活跃
  LEAVE = 'leave',         // 请假
  QUIT = 'quit'            // 退出
}

// 活动相关类型
export interface Activity {
  id: string;
  name: string;           // 活动名称
  description: string;    // 活动描述
  startTime: Date;        // 开始时间
  endTime: Date;          // 结束时间
  participants: string[]; // 参与者ID列表
  status: ActivityStatus; // 活动状态
  createdAt: Date;
  updatedAt: Date;
}

// 活动状态枚举
export enum ActivityStatus {
  UPCOMING = 'upcoming', // 即将开始
  ONGOING = 'ongoing',   // 进行中
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled'  // 已取消
}