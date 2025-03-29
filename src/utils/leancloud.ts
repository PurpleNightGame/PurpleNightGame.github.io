import AV from 'leancloud-storage';

// 初始化LeanCloud SDK
// 注意：实际使用时需要替换为真实的AppID和AppKey
export const initLeanCloud = () => {
  AV.init({
    appId: 'zgIzsvGerDuX3SJmLsKDKs6k-gzGzoHsz',
    appKey: 'wyqlYopPy4q7z9rUo9SaWeY8',
    serverURL: 'https://zgizsvge.lc-cn-n1-shared.com'
  });
};

// 用户相关操作
export const userService = {
  // 用户注册 - 仅供系统管理员使用，不对普通用户开放
  register: async (username: string, password: string, email: string) => {
    const user = new AV.User();
    user.setUsername(username);
    user.setPassword(password);
    user.setEmail(email);
    return user.signUp();
  },

  // 用户登录
  login: async (username: string, password: string) => {
    return AV.User.logIn(username, password);
  },

  // 获取当前用户
  getCurrentUser: () => {
    return AV.User.current();
  },

  // 用户登出
  logout: () => {
    return AV.User.logOut();
  },
  
  // 更新用户密码 - 通过旧密码修改新密码
  updatePassword: async (oldPassword: string, newPassword: string) => {
    // LeanCloud JS SDK不直接提供updatePassword方法
    const currentUser = AV.User.current();
    if (!currentUser) {
      throw new Error('用户未登录');
    }
    
    // 保存当前用户名
    const username = currentUser.getUsername();
    
    try {
      // 首先使用旧密码重新登录验证身份
      await AV.User.logOut(); // 先登出当前用户
      const user = await AV.User.logIn(username, oldPassword);
      
      // 验证成功后，设置新密码
      user.setPassword(newPassword);
      await user.save();
      
      // 使用新密码重新登录
      await AV.User.logOut();
      await AV.User.logIn(username, newPassword);
      
      return true;
    } catch (error) {
      // 如果发生错误，尝试使用旧密码重新登录恢复会话
      try {
        await AV.User.logIn(username, oldPassword);
      } catch (loginError) {
        console.error('恢复登录失败:', loginError);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('invalid username/password')) {
          throw new Error('当前密码不正确');
        }
        throw error;
      }
      throw new Error('密码修改失败，请稍后重试');
    }
  },
  
  // 请求密码重置
  requestPasswordReset: async (email: string) => {
    return AV.User.requestPasswordReset(email);
  }
};

// 成员相关操作
export const memberService = {
  // 获取所有成员
  getAllMembers: async () => {
    const query = new AV.Query('Member');
    return query.find();
  },

  // 添加成员
  addMember: async (data: any) => {
    const Member = AV.Object.extend('Member');
    const member = new Member();
    
    // 过滤掉LeanCloud保留字段
    const reservedFields = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    Object.keys(data).forEach(key => {
      if (!reservedFields.includes(key)) {
        member.set(key, data[key]);
      }
    });
    
    return member.save();
  },

  // 更新成员
  updateMember: async (id: string, data: any) => {
    const member = AV.Object.createWithoutData('Member', id);
    Object.keys(data).forEach(key => {
      member.set(key, data[key]);
    });
    return member.save();
  },

  // 删除成员
  deleteMember: async (id: string) => {
    const member = AV.Object.createWithoutData('Member', id);
    return member.destroy();
  },

  // 根据ID获取成员
  getMemberById: async (id: string) => {
    const query = new AV.Query('Member');
    return query.get(id);
  }
};

// 考核记录相关操作
export const examService = {
  // 获取所有考核记录
  getAllExams: async () => {
    const query = new AV.Query('ExamRecord');
    query.include('member'); // 关联成员信息
    query.descending('createdAt'); // 按创建时间降序排列
    return query.find();
  },
  
  // 获取指定成员的考核记录
  getExamsByMemberId: async (memberId: string) => {
    const query = new AV.Query('ExamRecord');
    query.equalTo('memberId', memberId);
    query.descending('createdAt');
    return query.find();
  },
  
  // 创建考核记录
  createExam: async (examData: any) => {
    const ExamRecord = AV.Object.extend('ExamRecord');
    const exam = new ExamRecord();
    
    // 过滤掉LeanCloud保留字段
    const reservedFields = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    Object.keys(examData).forEach(key => {
      if (!reservedFields.includes(key)) {
        exam.set(key, examData[key]);
      }
    });
    
    return exam.save();
  },
  
  // 更新考核记录
  updateExam: async (examId: string, examData: any) => {
    const exam = AV.Object.createWithoutData('ExamRecord', examId);
    
    Object.keys(examData).forEach(key => {
      if (key !== 'id' && key !== 'objectId') {
        exam.set(key, examData[key]);
      }
    });
    
    return exam.save();
  },
  
  // 删除考核记录
  deleteExam: async (examId: string) => {
    const exam = AV.Object.createWithoutData('ExamRecord', examId);
    return exam.destroy();
  }
};

// 退队记录相关操作
export const quitService = {
  // 获取所有待审批的退队记录
  getPendingQuitRequests: async () => {
    const query = new AV.Query('QuitRecord');
    query.equalTo('isPending', true);
    query.descending('createdAt');
    return query.find();
  },
  
  // 获取所有已批准的退队记录
  getApprovedQuitRecords: async () => {
    const query = new AV.Query('QuitRecord');
    query.equalTo('isApproved', true);
    query.equalTo('isPending', false);
    query.descending('approvedAt');
    query.limit(1000);
    return query.find();
  },
  
  // 创建退队请求
  createQuitRequest: async (data: any) => {
    const QuitRecord = AV.Object.extend('QuitRecord');
    const record = new QuitRecord();
    
    // 过滤掉LeanCloud保留字段并设置记录属性
    const reservedFields = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    Object.keys(data).forEach(key => {
      if (!reservedFields.includes(key)) {
        record.set(key, data[key]);
      }
    });
    
    return record.save();
  },
  
  // 批准退队请求
  approveQuitRequest: async (quitId: string, adminRemark: string) => {
    const record = AV.Object.createWithoutData('QuitRecord', quitId);
    record.set('isApproved', true);
    record.set('isPending', false);
    record.set('adminRemark', adminRemark);
    record.set('approvedAt', new Date());
    return record.save();
  },
  
  // 拒绝退队请求
  rejectQuitRequest: async (quitId: string, adminRemark: string) => {
    const record = AV.Object.createWithoutData('QuitRecord', quitId);
    record.set('isApproved', false);
    record.set('isPending', false);
    record.set('adminRemark', adminRemark);
    record.set('approvedAt', new Date());
    return record.save();
  }
};

// 留队申请服务
export const stayService = {
  async getPendingStayRequests() {
    try {
      const query = new AV.Query('StayRecord');
      query.equalTo('isPending', true);
      query.descending('createdAt');
      const results = await query.find();
      return results;
    } catch (error) {
      console.error('获取待审批留队请求失败:', error);
      throw error;
    }
  },
  
  async approveStayRequest(stayId: string, adminRemark: string, validUntil: Date) {
    try {
      const record = AV.Object.createWithoutData('StayRecord', stayId);
      record.set('isApproved', true);
      record.set('isPending', false);
      record.set('adminRemark', adminRemark);
      record.set('approvedAt', new Date());
      record.set('validUntil', validUntil);
      return await record.save();
    } catch (error) {
      console.error('审批留队请求失败:', error);
      throw error;
    }
  },
  
  async rejectStayRequest(stayId: string, adminRemark: string) {
    try {
      const record = AV.Object.createWithoutData('StayRecord', stayId);
      record.set('isApproved', false);
      record.set('isPending', false);
      record.set('adminRemark', adminRemark);
      record.set('approvedAt', new Date());
      return await record.save();
    } catch (error) {
      console.error('拒绝留队请求失败:', error);
      throw error;
    }
  },

  async createStayRequest(data: Partial<any>) {
    try {
      const StayRecordClass = AV.Object.extend('StayRecord');
      const record = new StayRecordClass();
      
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 设置默认值
      record.set('isPending', true);
      
      return await record.save();
    } catch (error) {
      console.error('创建留队请求失败:', error);
      throw error;
    }
  },
  
  async checkValidStayRequest(memberId: string) {
    try {
      const query = new AV.Query('StayRecord');
      query.equalTo('memberId', memberId);
      query.equalTo('isApproved', true);
      query.greaterThan('validUntil', new Date());
      const count = await query.count();
      return count > 0;
    } catch (error) {
      console.error('检查有效留队请求失败:', error);
      
      // 如果是表不存在错误，初始化表并返回false
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('StayRecord表不存在，需要初始化');
        
        try {
          // 尝试初始化表结构
          const StayRecord = AV.Object.extend('StayRecord');
          const record = new StayRecord();
          record.set('memberId', 'temp_init_id');
          record.set('reason', '初始化表结构');
          record.set('date', new Date());
          record.set('isPending', true);
          
          await record.save();
          await record.destroy();
          
          console.log('StayRecord表初始化成功');
        } catch (initError) {
          console.error('StayRecord表初始化失败:', initError);
        }
        
        return false;
      }
      
      return false;
    }
  }
};

// 黑点记录相关操作
export const blackpointService = {
  // 获取所有黑点记录
  getAllBlackpoints: async () => {
    const query = new AV.Query('BlackpointRecord');
    query.descending('date'); // 按记录日期降序排列
    return query.find();
  },
  
  // 获取指定成员的黑点记录
  getBlackpointsByMemberId: async (memberId: string) => {
    const query = new AV.Query('BlackpointRecord');
    query.equalTo('memberId', memberId);
    query.descending('date');
    return query.find();
  },
  
  // 获取有效的黑点记录（一个月内的）
  getActiveBlackpoints: async () => {
    const query = new AV.Query('BlackpointRecord');
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    query.greaterThan('date', oneMonthAgo);
    query.equalTo('isActive', true);
    return query.find();
  },
  
  // 创建黑点记录
  createBlackpoint: async (data: any) => {
    const BlackpointRecord = AV.Object.extend('BlackpointRecord');
    const record = new BlackpointRecord();
    
    // 过滤掉LeanCloud保留字段
    const reservedFields = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    Object.keys(data).forEach(key => {
      if (!reservedFields.includes(key)) {
        record.set(key, data[key]);
      }
    });
    
    return record.save();
  },
  
  // 更新黑点记录
  updateBlackpoint: async (id: string, data: any) => {
    const record = AV.Object.createWithoutData('BlackpointRecord', id);
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'objectId') {
        record.set(key, data[key]);
      }
    });
    
    return record.save();
  },
  
  // 删除黑点记录
  deleteBlackpoint: async (id: string) => {
    const record = AV.Object.createWithoutData('BlackpointRecord', id);
    return record.destroy();
  },
  
  // 使黑点无效（不删除记录）
  deactivateBlackpoint: async (id: string) => {
    const record = AV.Object.createWithoutData('BlackpointRecord', id);
    record.set('isActive', false);
    return record.save();
  }
};

// 请假记录相关操作
export const leaveService = {
  // 获取所有请假记录
  getAllLeaveRecords: async () => {
    const query = new AV.Query('LeaveRecord');
    query.descending('createdAt'); // 按创建时间降序排列
    return query.find();
  },
  
  // 获取指定成员的请假记录
  getLeaveRecordsByMemberId: async (memberId: string) => {
    const query = new AV.Query('LeaveRecord');
    query.equalTo('memberId', memberId);
    query.descending('createdAt');
    return query.find();
  },
  
  // 获取当前活跃的请假记录（状态为active）
  getActiveLeaveRecords: async () => {
    const query = new AV.Query('LeaveRecord');
    query.equalTo('status', 'active');
    query.greaterThan('endDate', new Date()); // 结束日期在当前日期之后
    return query.find();
  },
  
  // 创建请假记录
  createLeaveRecord: async (data: any) => {
    const LeaveRecord = AV.Object.extend('LeaveRecord');
    const record = new LeaveRecord();
    
    // 过滤掉LeanCloud保留字段
    const reservedFields = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    Object.keys(data).forEach(key => {
      if (!reservedFields.includes(key)) {
        record.set(key, data[key]);
      }
    });
    
    return record.save();
  },
  
  // 更新请假记录
  updateLeaveRecord: async (id: string, data: any) => {
    const record = AV.Object.createWithoutData('LeaveRecord', id);
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'objectId') {
        record.set(key, data[key]);
      }
    });
    
    return record.save();
  },
  
  // 删除请假记录
  deleteLeaveRecord: async (id: string) => {
    const record = AV.Object.createWithoutData('LeaveRecord', id);
    return record.destroy();
  },
  
  // 结束请假（将状态设为ended）
  endLeaveRecord: async (id: string) => {
    const record = AV.Object.createWithoutData('LeaveRecord', id);
    record.set('status', 'ended');
    return record.save();
  },
  
  // 取消请假（将状态设为cancelled）
  cancelLeaveRecord: async (id: string) => {
    const record = AV.Object.createWithoutData('LeaveRecord', id);
    record.set('status', 'cancelled');
    return record.save();
  }
};