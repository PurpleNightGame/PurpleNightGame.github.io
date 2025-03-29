import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Typography, 
  Form,
  Input,
  message,
  Divider,
  Popconfirm,
  Badge,
  Select,
  Alert,
  Tooltip,
  Checkbox,
  notification,
  Tabs,
  DatePicker
} from 'antd';
import { 
  TeamOutlined, 
  EyeOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  MoreOutlined,
  FilterOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import AV from 'leancloud-storage';
import { QuitRecord, Member, MemberStatus, StayRecord, MemberStage } from '../types/member';
import { memberService } from '../utils/leancloud';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useMessage } from '../utils/messageUtil';
import { getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// 退队记录服务
const quitService = {
  async getPendingQuitRequests() {
    try {
      const query = new AV.Query('QuitRecord');
      query.equalTo('isPending', true);
      query.descending('createdAt');
      const results = await query.find();
      return results;
    } catch (error) {
      console.error('获取待审批退队请求失败:', error);
      throw error;
    }
  },
  
  async approveQuitRequest(quitId: string, adminRemark: string) {
    try {
      const record = AV.Object.createWithoutData('QuitRecord', quitId);
      record.set('isApproved', true);
      record.set('isPending', false);
      record.set('adminRemark', adminRemark);
      record.set('approvedAt', new Date());
      return await record.save();
    } catch (error) {
      console.error('审批退队请求失败:', error);
      throw error;
    }
  },
  
  async rejectQuitRequest(quitId: string, adminRemark: string) {
    try {
      const record = AV.Object.createWithoutData('QuitRecord', quitId);
      record.set('isApproved', false);
      record.set('isPending', false);
      record.set('adminRemark', adminRemark);
      record.set('approvedAt', new Date());
      return await record.save();
    } catch (error) {
      console.error('拒绝退队请求失败:', error);
      throw error;
    }
  },
  
  async updateMemberStatus(memberId: string, status: MemberStatus) {
    try {
      await memberService.updateMember(memberId, {
        status: status
      });
    } catch (error) {
      console.error('更新成员状态失败:', error);
      throw error;
    }
  },

  async createQuitRequest(data: Partial<QuitRecord>) {
    try {
      const QuitRecordClass = AV.Object.extend('QuitRecord');
      const record = new QuitRecordClass();
      
      Object.entries(data).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      return await record.save();
    } catch (error) {
      console.error('创建退队请求失败:', error);
      throw error;
    }
  }
};

// 留队申请服务
const stayService = {
  async getPendingStayRequests() {
    try {
      const query = new AV.Query('StayRecord');
      query.equalTo('isPending', true);
      query.descending('createdAt');
      const results = await query.find();
      return results;
    } catch (error) {
      console.error('获取待审批留队请求失败:', error);
      // 当表不存在时，直接返回空数组而不是抛出错误
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('StayRecord表不存在，可能需要初始化，返回空数组');
        return [];
      }
      throw error;
    }
  },
  
  async approveStayRequest(stayId: string, adminRemark: string) {
    try {
      // 先获取记录以获取申请时设置的有效期
      const query = new AV.Query('StayRecord');
      const record = await query.get(stayId);
      const requestedValidUntil = record.get('requestedValidUntil');
      
      // 更新记录状态
      record.set('isApproved', true);
      record.set('isPending', false);
      record.set('adminRemark', adminRemark);
      record.set('approvedAt', new Date());
      record.set('validUntil', requestedValidUntil); // 使用申请时设置的有效期
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
      
      // 如果是表不存在的错误，尝试创建表后重试
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('尝试初始化StayRecord表并重新创建留队申请');
        
        try {
          // 创建表结构
          const StayRecordClass = AV.Object.extend('StayRecord');
          const initRecord = new StayRecordClass();
          initRecord.set('memberId', 'temp_init_id');
          initRecord.set('reason', '初始化表结构');
          initRecord.set('date', new Date());
          initRecord.set('isPending', true);
          
          await initRecord.save();
          await initRecord.destroy();
          
          // 重新尝试保存原始记录
          const newRecord = new StayRecordClass();
          Object.entries(data).forEach(([key, value]) => {
            newRecord.set(key, value);
          });
          newRecord.set('isPending', true);
          
          return await newRecord.save();
        } catch (initError) {
          console.error('初始化StayRecord表后重试失败:', initError);
          throw initError;
        }
      }
      
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
      // 当表不存在时，认为没有有效的留队申请
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('StayRecord表不存在，可能需要初始化，返回false');
        return false;
      }
      return false;
    }
  }
};

interface QuitRequestItem {
  key: string;
  id: string;
  memberId: string;
  memberName: string;
  memberQQ: string;
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

interface StayRequestItem {
  key: string;
  id: string;
  memberId: string;
  memberName: string;
  memberQQ: string;
  reason: string;
  date: Date;
  isPending: boolean;
  isApproved?: boolean;
  adminRemark?: string;
  createdAt: Date;
  approvedAt?: Date;
  validUntil?: Date;
  requestedValidUntil?: Date; // 添加申请时设置的有效期字段
}

// 各个表格的页面唯一标识，用于缓存分页设置
const QUIT_REQUESTS_PAGE_ID = 'quit_approval_requests';
const STAY_REQUESTS_PAGE_ID = 'quit_approval_stay_requests';
const VALID_STAY_RECORDS_PAGE_ID = 'quit_approval_valid_stay_records';

const QuitApproval: React.FC = () => {
  const [quitRequests, setQuitRequests] = useState<QuitRequestItem[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<QuitRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberDict, setMemberDict] = useState<Record<string, Member>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<QuitRequestItem | null>(null);
  const [remarkForm] = Form.useForm();
  const navigate = useNavigate();
  const message = useMessage();
  
  // 创建退队请求相关状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // 批量操作相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchApproveVisible, setBatchApproveVisible] = useState(false);
  const [batchRejectVisible, setBatchRejectVisible] = useState(false);
  const [batchRemarkForm] = Form.useForm();
  
  // 拒绝后提示相关状态
  const [rejectResultVisible, setRejectResultVisible] = useState(false);
  const [batchRejectResultVisible, setBatchRejectResultVisible] = useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = useState(0);
  const [rejectedMemberName, setRejectedMemberName] = useState('');

  // 留队申请相关状态
  const [stayRequests, setStayRequests] = useState<StayRequestItem[]>([]);
  const [currentStayRequest, setCurrentStayRequest] = useState<StayRequestItem | null>(null);
  const [stayDetailVisible, setStayDetailVisible] = useState(false);
  const [stayRemarkForm] = Form.useForm();
  const [createStayModalVisible, setCreateStayModalVisible] = useState(false);
  const [createStayForm] = Form.useForm();
  const [activeTabKey, setActiveTabKey] = useState('1');
  
  // 添加留队记录状态
  const [validStayRecords, setValidStayRecords] = useState<StayRequestItem[]>([]);
  const [loadingStayRecords, setLoadingStayRecords] = useState(false);
  const [stayRecordDetailVisible, setStayRecordDetailVisible] = useState(false);
  const [currentStayRecord, setCurrentStayRecord] = useState<StayRequestItem | null>(null);

  // 使用缓存初始化分页状态
  const [quitRequestsPagination, setQuitRequestsPagination] = useState(() => ({
    ...getPaginationFromCache(QUIT_REQUESTS_PAGE_ID),
    total: 0
  }));
  
  const [stayRequestsPagination, setStayRequestsPagination] = useState(() => ({
    ...getPaginationFromCache(STAY_REQUESTS_PAGE_ID),
    total: 0
  }));
  
  const [validStayRecordsPagination, setValidStayRecordsPagination] = useState(() => ({
    ...getPaginationFromCache(VALID_STAY_RECORDS_PAGE_ID),
    total: 0
  }));

  // 获取所有待审批退队请求和成员
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取所有成员
      const memberResults = await memberService.getAllMembers();
      const formattedMembers = memberResults.map((item: any) => ({
        key: item.id,
        id: item.id,
        nickname: item.get('nickname'),
        qqNumber: item.get('qqNumber'),
        gameId: item.get('gameId') || '',
        joinDate: item.get('joinDate'),
        lastTrainingDate: item.get('lastTrainingDate'),
        stage: item.get('stage'),
        status: item.get('status'),
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false,
        remarks: item.get('remarks') || ''
      })) as Member[];
      
      setMembers(formattedMembers);
      
      // 创建成员字典用于快速查找
      const memberDictionary: Record<string, Member> = {};
      formattedMembers.forEach(member => {
        memberDictionary[member.id] = member;
      });
      
      setMemberDict(memberDictionary);
      
      // 获取所有待审批退队请求
      const quitResults = await quitService.getPendingQuitRequests();
      const formattedRequests = quitResults.map((item: any) => {
        const memberId = item.get('memberId');
        const member = memberDictionary[memberId];
        
        return {
          key: item.id,
          id: item.id,
          memberId: memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qqNumber : '未知',
          reason: item.get('reason'),
          date: item.get('date'),
          isAutomatic: item.get('isAutomatic') || false,
          source: item.get('source'),
          isPending: item.get('isPending'),
          isApproved: item.get('isApproved'),
          adminRemark: item.get('adminRemark'),
          createdAt: item.createdAt,
          approvedAt: item.get('approvedAt')
        };
      });
      
      setQuitRequests(formattedRequests);
      
      // 获取所有待审批留队请求
      const stayResults = await stayService.getPendingStayRequests();
      const formattedStayRequests = stayResults.map((item: any) => {
        const memberId = item.get('memberId');
        const member = memberDictionary[memberId];
        
        return {
          key: item.id,
          id: item.id,
          memberId: memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qqNumber : '未知',
          reason: item.get('reason'),
          date: item.get('date'),
          isPending: item.get('isPending'),
          isApproved: item.get('isApproved'),
          adminRemark: item.get('adminRemark'),
          createdAt: item.createdAt,
          approvedAt: item.get('approvedAt'),
          validUntil: item.get('validUntil'),
          requestedValidUntil: item.get('requestedValidUntil') // 添加获取申请时设置的有效期
        };
      });
      
      setStayRequests(formattedStayRequests);
      
      // 获取所有有效的留队记录
      await fetchValidStayRecords(memberDictionary);
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };
  
  // 获取有效的留队记录
  const fetchValidStayRecords = async (memberDict: Record<string, Member>) => {
    try {
      setLoadingStayRecords(true);
      
      // 查询所有已批准且未过期的留队记录
      const query = new AV.Query('StayRecord');
      query.equalTo('isApproved', true);
      query.equalTo('isPending', false);
      query.greaterThan('validUntil', new Date());
      query.descending('validUntil'); // 按有效期降序排列
      
      const results = await query.find();
      
      // 格式化记录
      const formattedRecords = results.map((item: any) => {
        const memberId = item.get('memberId');
        const member = memberDict[memberId];
        
        return {
          key: item.id,
          id: item.id,
          memberId: memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qqNumber : '未知',
          reason: item.get('reason'),
          date: item.get('date'),
          isPending: false,
          isApproved: true,
          adminRemark: item.get('adminRemark'),
          createdAt: item.createdAt,
          approvedAt: item.get('approvedAt'),
          validUntil: item.get('validUntil'),
          requestedValidUntil: item.get('requestedValidUntil') // 添加申请时设置的有效期
        };
      });
      
      setValidStayRecords(formattedRecords);
    } catch (error) {
      console.error('获取有效留队记录失败:', error);
      
      // 如果是表不存在错误，返回空数组
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('StayRecord表不存在，返回空数组');
        setValidStayRecords([]);
      } else {
        message.error('获取留队记录失败');
      }
    } finally {
      setLoadingStayRecords(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    fetchData();
  }, []);

  // 查看详情
  const showDetail = (record: QuitRequestItem) => {
    setCurrentRequest(record);
    setDetailVisible(true);
  };
  
  // 审批退队请求
  const handleApproveQuit = async () => {
    try {
      if (!currentRequest) return;
      
      const values = await remarkForm.validateFields();
      setLoading(true);
      
      // 更新退队记录状态为"已审批"
      await quitService.approveQuitRequest(currentRequest.id, values.adminRemark);
      
      // 删除成员及其所有相关记录
      try {
        const memberId = currentRequest.memberId;
        
        // 1. 删除与成员相关的黑点记录
        const blackpointQuery = new AV.Query('BlackpointRecord');
        blackpointQuery.equalTo('memberId', memberId);
        const blackpoints = await blackpointQuery.find();
        if (blackpoints.length > 0) {
          // 使用 Promise.all 来逐个删除对象
          await Promise.all(blackpoints.map(record => record.destroy()));
          console.log(`已删除 ${blackpoints.length} 条黑点记录`);
        }
        
        // 2. 删除与成员相关的请假记录
        const leaveQuery = new AV.Query('LeaveRecord');
        leaveQuery.equalTo('memberId', memberId);
        const leaveRecords = await leaveQuery.find();
        if (leaveRecords.length > 0) {
          await Promise.all(leaveRecords.map(record => record.destroy()));
          console.log(`已删除 ${leaveRecords.length} 条请假记录`);
        }
        
        // 3. 删除与成员相关的新训记录
        // 注：系统中不存在 TrainingRecord 表，训练日期直接存储在 Member 对象的 lastTrainingDate 字段中
        // 以下代码会导致 404 错误，因此注释掉
        /* 
        const trainingQuery = new AV.Query('TrainingRecord');
        trainingQuery.equalTo('memberId', memberId);
        const trainingRecords = await trainingQuery.find();
        if (trainingRecords.length > 0) {
          await Promise.all(trainingRecords.map(record => record.destroy()));
          console.log(`已删除 ${trainingRecords.length} 条新训记录`);
        }
        */
        
        // 4. 删除与成员相关的考核记录
        const examQuery = new AV.Query('ExamRecord');
        examQuery.equalTo('memberId', memberId);
        const examRecords = await examQuery.find();
        if (examRecords.length > 0) {
          await Promise.all(examRecords.map(record => record.destroy()));
          console.log(`已删除 ${examRecords.length} 条考核记录`);
        }
        
        // 5. 删除该成员的所有退队记录（当前正在处理的除外）
        const quitQuery = new AV.Query('QuitRecord');
        quitQuery.equalTo('memberId', memberId);
        quitQuery.notEqualTo('objectId', currentRequest.id); // 排除当前正在处理的记录
        const quitRecords = await quitQuery.find();
        if (quitRecords.length > 0) {
          await Promise.all(quitRecords.map(record => record.destroy()));
          console.log(`已删除 ${quitRecords.length} 条额外的退队记录`);
        }
        
        // 6. 删除与成员相关的留队记录
        try {
          const stayQuery = new AV.Query('StayRecord');
          stayQuery.equalTo('memberId', memberId);
          const stayRecords = await stayQuery.find();
          if (stayRecords.length > 0) {
            await Promise.all(stayRecords.map(record => record.destroy()));
            console.log(`已删除 ${stayRecords.length} 条留队记录`);
          }
        } catch (stayError) {
          console.error('删除留队记录失败:', stayError);
          // 继续执行，不中断整个流程
        }
        
        // 7. 最后删除成员本身
        const memberObj = AV.Object.createWithoutData('Member', memberId);
        await memberObj.destroy();
        
        message.success(`成员 ${currentRequest.memberName} 及其所有相关记录已从系统中移除`);
      } catch (deleteError) {
        console.error('删除成员及相关记录失败:', deleteError);
        message.warning(`退队申请已批准，但成员记录删除可能不完全，请检查并手动处理`);
      }
      
      message.success('已审批通过退队请求');
      
      // 关闭详情模态框
      setDetailVisible(false);
      remarkForm.resetFields();
      
      // 刷新数据
      fetchData();
    } catch (error) {
      console.error('审批退队请求失败:', error);
      message.error('审批退队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 拒绝退队请求
  const handleRejectQuit = async () => {
    try {
      if (!currentRequest) return;
      
      const values = await remarkForm.validateFields();
      setLoading(true);
      
      // 保存成员信息用于重新添加
      const memberInfo = {
        nickname: currentRequest.memberName,
        qqNumber: currentRequest.memberQQ,
        joinDate: memberDict[currentRequest.memberId]?.joinDate || new Date()
      };
      
      // 更新退队记录状态为"已拒绝"
      await quitService.rejectQuitRequest(currentRequest.id, values.adminRemark);
      
      // 删除成员及其所有相关记录（与批准流程相同）
      try {
        const memberId = currentRequest.memberId;
        const memberName = currentRequest.memberName;
        setRejectedMemberName(memberName); // 保存被拒绝的成员名称
        
        // 使用try-catch分别处理每种记录的删除，避免一个失败导致整个流程中断
        
        // 1. 删除与成员相关的黑点记录
        try {
          // 使用正确的类名 BlackpointRecord
          let blackpoints: any[] = [];
          try {
            const blackpointQuery = new AV.Query('BlackpointRecord');
            blackpointQuery.equalTo('memberId', memberId);
            blackpoints = await blackpointQuery.find();
          } catch (err) {
            console.log('查询黑点记录失败:', err);
          }
          
          if (blackpoints.length > 0) {
            await Promise.all(blackpoints.map(record => record.destroy().catch((e: any) => console.log('删除黑点记录失败:', e))));
          }
        } catch (bpError) {
          console.log('处理黑点记录失败:', bpError);
        }
        
        // 2. 删除与成员相关的请假记录
        try {
          const leaveQuery = new AV.Query('LeaveRecord');
          leaveQuery.equalTo('memberId', memberId);
          const leaveRecords = await leaveQuery.find();
          if (leaveRecords.length > 0) {
            await Promise.all(leaveRecords.map(record => record.destroy().catch((e: any) => console.log('删除请假记录失败:', e))));
            console.log(`已删除 ${leaveRecords.length} 条请假记录`);
          }
        } catch (leaveError) {
          console.log('处理请假记录失败:', leaveError);
        }
        
        // 3. 删除与成员相关的新训记录
        // 注：系统中不存在 TrainingRecord 表，训练日期直接存储在 Member 对象的 lastTrainingDate 字段中
        // 以下代码会导致 404 错误，因此注释掉
        /* 
        const trainingQuery = new AV.Query('TrainingRecord');
        trainingQuery.equalTo('memberId', memberId);
        const trainingRecords = await trainingQuery.find();
        if (trainingRecords.length > 0) {
          await Promise.all(trainingRecords.map(record => record.destroy()));
          console.log(`已删除 ${trainingRecords.length} 条新训记录`);
        }
        */
        
        // 4. 删除与成员相关的考核记录
        try {
          const examQuery = new AV.Query('ExamRecord');
          examQuery.equalTo('memberId', memberId);
          const examRecords = await examQuery.find();
          if (examRecords.length > 0) {
            await Promise.all(examRecords.map(record => record.destroy().catch((e: any) => console.log('删除考核记录失败:', e))));
            console.log(`已删除 ${examRecords.length} 条考核记录`);
          }
        } catch (examError) {
          console.log('处理考核记录失败:', examError);
        }
        
        // 5. 删除该成员的所有退队记录（当前正在处理的除外）
        try {
          const quitQuery = new AV.Query('QuitRecord');
          quitQuery.equalTo('memberId', memberId);
          quitQuery.notEqualTo('objectId', currentRequest.id); // 排除当前正在处理的记录
          const quitRecords = await quitQuery.find();
          if (quitRecords.length > 0) {
            await Promise.all(quitRecords.map(record => record.destroy().catch((e: any) => console.log('删除退队记录失败:', e))));
            console.log(`已删除 ${quitRecords.length} 条额外的退队记录`);
          }
        } catch (quitError) {
          console.log('处理额外退队记录失败:', quitError);
        }
        
        // 6. 删除与成员相关的留队记录
        try {
          const stayQuery = new AV.Query('StayRecord');
          stayQuery.equalTo('memberId', memberId);
          const stayRecords = await stayQuery.find();
          if (stayRecords.length > 0) {
            await Promise.all(stayRecords.map(record => record.destroy()));
            console.log(`已删除 ${stayRecords.length} 条留队记录`);
          }
        } catch (stayError) {
          console.error('删除留队记录失败:', stayError);
          // 继续执行，不中断整个流程
        }
        
        // 7. 最后删除成员本身
        try {
          const memberObj = AV.Object.createWithoutData('Member', memberId);
          await memberObj.destroy();
          console.log('成员已删除');
        } catch (memberError) {
          console.log('删除成员失败:', memberError);
          throw memberError; // 如果成员删除失败，这是关键错误，应该抛出
        }
        
        message.warning(`已拒绝退队申请，但成员 ${memberName} 及其所有相关记录已从系统中移除，请重新添加该成员`);
        
        // 保存成员信息到本地存储，以便在添加页面使用
        localStorage.setItem('rejectedMemberInfo', JSON.stringify(memberInfo));
      } catch (deleteError) {
        console.error('删除成员及相关记录失败:', deleteError);
        message.warning(`退队申请已拒绝，但成员记录删除可能不完全，请检查并手动处理`);
      }
      
      // 关闭详情模态框
      setDetailVisible(false);
      remarkForm.resetFields();
      
      // 刷新数据
      fetchData();

      // 显示拒绝结果对话框，不再使用Modal.confirm
      setRejectResultVisible(true);
    } catch (error) {
      console.error('拒绝退队请求失败:', error);
      message.error('拒绝退队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理拒绝结果对话框的确认操作
  const handleRejectResultOk = () => {
    setRejectResultVisible(false);
    navigate('/members/add'); // 修正路径为'/members/add'而不是'/member/add'
  };

  // 处理拒绝结果对话框的取消操作
  const handleRejectResultCancel = () => {
    setRejectResultVisible(false);
  };

  // 获取退队来源标签
  const getSourceTag = (source: string) => {
    switch (source) {
      case 'untrained':
        return <Tag color="orange">长期未新训</Tag>;
      case 'reminder':
        return <Tag color="purple">系统提醒</Tag>;
      case 'blackpoint':
        return <Tag color="red">黑点退队</Tag>;
      case 'manual':
        return <Tag color="blue">手动提交</Tag>;
      default:
        return <Tag color="default">未知来源</Tag>;
    }
  };

  // 手动创建退队请求
  const showCreateModal = () => {
    createForm.resetFields();
    setSelectedMember(null);
    setCreateModalVisible(true);
  };

  const handleCreateCancel = () => {
    setCreateModalVisible(false);
  };

  const handleMemberChange = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    setSelectedMember(member || null);
    
    if (member) {
      // 检查该成员是否已有有效的留队申请
      const hasValidStay = await stayService.checkValidStayRequest(memberId);
      
      if (hasValidStay) {
        message.warning('注意：该成员已有在有效期内的留队申请，提交后将被拒绝');
        return;
      }

      // 同时检查是否有待审批的留队申请
      const hasPendingRequest = await checkPendingStayRequest(memberId);
      
      if (hasPendingRequest) {
        message.warning('注意：该成员已有待审批的留队申请，提交后将被拒绝');
        return;
      }
    }
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      setLoading(true);

      const quitData: Partial<QuitRecord> = {
        memberId: values.memberId,
        reason: values.reason,
        date: new Date(),
        isAutomatic: false,
        source: 'manual'
      };

      // 在LeanCloud中设置isPending字段
      const QuitRecordClass = AV.Object.extend('QuitRecord');
      const record = new QuitRecordClass();
      
      Object.entries(quitData).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      // 单独设置isPending字段
      record.set('isPending', true);
      
      await record.save();
      
      message.success('退队请求已创建，等待审批');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('创建退队请求失败:', error);
      message.error('创建退队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 显示批量批准确认框
  const showBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要批准的退队申请');
      return;
    }
    batchRemarkForm.resetFields();
    setBatchApproveVisible(true);
  };

  // 显示批量拒绝确认框
  const showBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要拒绝的退队申请');
      return;
    }
    batchRemarkForm.resetFields();
    setBatchRejectVisible(true);
  };

  // 批量批准退队
  const handleBatchApprove = async () => {
    try {
      const values = await batchRemarkForm.validateFields();
      setLoading(true);
      
      let successCount = 0;
      let errorCount = 0;
      
      // 逐个处理选中的退队请求
      for (const requestId of selectedRowKeys) {
        const request = quitRequests.find(q => q.id === requestId);
        if (!request) continue;
        
        try {
          // 更新退队记录状态为"已审批"
          await quitService.approveQuitRequest(request.id, values.adminRemark);
          
          // 删除成员及相关记录
          const memberId = request.memberId;
          
          // 1. 删除与成员相关的黑点记录
          try {
            // 使用正确的类名 BlackpointRecord
            let blackpoints: any[] = [];
            try {
              const blackpointQuery = new AV.Query('BlackpointRecord');
              blackpointQuery.equalTo('memberId', memberId);
              blackpoints = await blackpointQuery.find();
            } catch (err) {
              console.log('查询黑点记录失败:', err);
            }
            
            if (blackpoints.length > 0) {
              await Promise.all(blackpoints.map(record => record.destroy().catch((e: any) => console.log('删除黑点记录失败:', e))));
            }
          } catch (bpError) {
            console.log('处理黑点记录失败:', bpError);
          }
          
          // 2. 删除与成员相关的请假记录
          try {
            const leaveQuery = new AV.Query('LeaveRecord');
            leaveQuery.equalTo('memberId', memberId);
            const leaveRecords = await leaveQuery.find();
            if (leaveRecords.length > 0) {
              await Promise.all(leaveRecords.map(record => record.destroy().catch((e: any) => console.log('删除请假记录失败:', e))));
            }
          } catch (leaveError) {
            console.log('处理请假记录失败:', leaveError);
          }
          
          // 3. 删除与成员相关的新训记录
          // 注：系统中不存在 TrainingRecord 表，训练日期直接存储在 Member 对象的 lastTrainingDate 字段中
          // 以下代码会导致 404 错误，因此注释掉
          /* 
          const trainingQuery = new AV.Query('TrainingRecord');
          trainingQuery.equalTo('memberId', memberId);
          const trainingRecords = await trainingQuery.find();
          if (trainingRecords.length > 0) {
            await Promise.all(trainingRecords.map(record => record.destroy()));
          }
          */
          
          // 4. 删除与成员相关的考核记录
          try {
            const examQuery = new AV.Query('ExamRecord');
            examQuery.equalTo('memberId', memberId);
            const examRecords = await examQuery.find();
            if (examRecords.length > 0) {
              await Promise.all(examRecords.map(record => record.destroy().catch((e: any) => console.log('删除考核记录失败:', e))));
            }
          } catch (examError) {
            console.log('处理考核记录失败:', examError);
          }
          
          // 5. 删除该成员的所有退队记录（当前正在处理的除外）
          try {
            const quitQuery = new AV.Query('QuitRecord');
            quitQuery.equalTo('memberId', memberId);
            quitQuery.notEqualTo('objectId', request.id);
            const quitRecords = await quitQuery.find();
            if (quitRecords.length > 0) {
              await Promise.all(quitRecords.map(record => record.destroy().catch((e: any) => console.log('删除退队记录失败:', e))));
            }
          } catch (quitError) {
            console.log('处理额外退队记录失败:', quitError);
          }
          
          // 6. 删除与成员相关的留队记录
          try {
            const stayQuery = new AV.Query('StayRecord');
            stayQuery.equalTo('memberId', memberId);
            const stayRecords = await stayQuery.find();
            if (stayRecords.length > 0) {
              await Promise.all(stayRecords.map(record => record.destroy()));
              console.log(`已删除 ${stayRecords.length} 条留队记录`);
            }
          } catch (stayError) {
            console.error('删除留队记录失败:', stayError);
            // 继续执行，不中断整个流程
          }
          
          // 7. 最后删除成员本身
          try {
            const memberObj = AV.Object.createWithoutData('Member', memberId);
            await memberObj.destroy();
          } catch (memberError) {
            console.log('删除成员失败:', memberError);
            throw memberError; // 成员删除失败是关键错误，需要抛出
          }
          
          successCount++;
        } catch (error) {
          console.error(`处理退队申请 ${request.id} 失败:`, error);
          errorCount++;
        }
      }
      
      // 显示处理结果
      if (successCount > 0) {
        message.success(`成功批准 ${successCount} 条退队申请，并删除相关成员及记录`);
      }
      
      if (errorCount > 0) {
        message.error(`${errorCount} 条退队申请处理失败，请手动检查`);
      }
      
      // 关闭模态框并重置
      setBatchApproveVisible(false);
      batchRemarkForm.resetFields();
      setSelectedRowKeys([]);
      
      // 刷新数据
      fetchData();
    } catch (error) {
      console.error('批量批准退队申请失败:', error);
      message.error('批量批准退队申请失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 批量拒绝退队
  const handleBatchReject = async () => {
    try {
      const values = await batchRemarkForm.validateFields();
      setBatchRejectVisible(false);
      setLoading(true);
      
      let successCount = 0;
      let failCount = 0;
      const selectedRequestIds = selectedRowKeys as string[];
      const selectedRequests = quitRequests.filter(item => selectedRequestIds.includes(item.id));
      
      // 如果只有一个成员被拒绝，保存其信息用于预填
      if (selectedRequests.length === 1) {
        const request = selectedRequests[0];
        const memberInfo = {
          nickname: request.memberName,
          qqNumber: request.memberQQ,
          joinDate: memberDict[request.memberId]?.joinDate || new Date()
        };
        localStorage.setItem('rejectedMemberInfo', JSON.stringify(memberInfo));
      } else {
        // 清除之前保存的信息
        localStorage.removeItem('rejectedMemberInfo');
      }
      
      // 处理每个选中的请求
      for (const request of selectedRequests) {
        try {
          // 更新退队记录状态为"已拒绝"
          await quitService.rejectQuitRequest(request.id, values.adminRemark);
          
          // 删除成员及其所有相关记录
          const memberId = request.memberId;
          
          // 1. 删除与成员相关的黑点记录
          try {
            // 使用正确的类名 BlackpointRecord
            let blackpoints: any[] = [];
            try {
              const blackpointQuery = new AV.Query('BlackpointRecord');
              blackpointQuery.equalTo('memberId', memberId);
              blackpoints = await blackpointQuery.find();
            } catch (err) {
              console.log('查询黑点记录失败:', err);
            }
            
            if (blackpoints.length > 0) {
              await Promise.all(blackpoints.map(record => record.destroy().catch((e: any) => console.log('删除黑点记录失败:', e))));
            }
          } catch (bpError) {
            console.log('处理黑点记录失败:', bpError);
          }
          
          // 2. 删除与成员相关的请假记录
          try {
            const leaveQuery = new AV.Query('LeaveRecord');
            leaveQuery.equalTo('memberId', memberId);
            const leaveRecords = await leaveQuery.find();
            if (leaveRecords.length > 0) {
              await Promise.all(leaveRecords.map(record => record.destroy().catch((e: any) => console.log('删除请假记录失败:', e))));
            }
          } catch (leaveError) {
            console.log('处理请假记录失败:', leaveError);
          }
          
          // 3. 删除与成员相关的新训记录
          // 注：系统中不存在 TrainingRecord 表，训练日期直接存储在 Member 对象的 lastTrainingDate 字段中
          // 以下代码会导致 404 错误，因此注释掉
          /* 
          const trainingQuery = new AV.Query('TrainingRecord');
          trainingQuery.equalTo('memberId', memberId);
          const trainingRecords = await trainingQuery.find();
          if (trainingRecords.length > 0) {
            await Promise.all(trainingRecords.map(record => record.destroy()));
          }
          */
          
          // 4. 删除与成员相关的考核记录
          try {
            const examQuery = new AV.Query('ExamRecord');
            examQuery.equalTo('memberId', memberId);
            const examRecords = await examQuery.find();
            if (examRecords.length > 0) {
              await Promise.all(examRecords.map(record => record.destroy().catch((e: any) => console.log('删除考核记录失败:', e))));
            }
          } catch (examError) {
            console.log('处理考核记录失败:', examError);
          }
          
          // 5. 删除该成员的所有退队记录（当前正在处理的除外）
          try {
            const quitQuery = new AV.Query('QuitRecord');
            quitQuery.equalTo('memberId', memberId);
            quitQuery.notEqualTo('objectId', request.id);
            const quitRecords = await quitQuery.find();
            if (quitRecords.length > 0) {
              await Promise.all(quitRecords.map(record => record.destroy().catch((e: any) => console.log('删除退队记录失败:', e))));
            }
          } catch (quitError) {
            console.log('处理额外退队记录失败:', quitError);
          }
          
          // 6. 删除与成员相关的留队记录
          try {
            const stayQuery = new AV.Query('StayRecord');
            stayQuery.equalTo('memberId', memberId);
            const stayRecords = await stayQuery.find();
            if (stayRecords.length > 0) {
              await Promise.all(stayRecords.map(record => record.destroy()));
              console.log(`已删除 ${stayRecords.length} 条留队记录`);
            }
          } catch (stayError) {
            console.error('删除留队记录失败:', stayError);
            // 继续执行，不中断整个流程
          }
          
          // 7. 最后删除成员本身
          try {
            const memberObj = AV.Object.createWithoutData('Member', memberId);
            await memberObj.destroy();
          } catch (memberError) {
            console.log('删除成员失败:', memberError);
            throw memberError;
          }
          
          successCount++;
        } catch (processError) {
          console.error(`处理退队请求 ${request.id} 失败:`, processError);
          failCount++;
        }
      }
      
      // 显示处理结果
      if (successCount > 0) {
        setBatchSuccessCount(successCount);
        setBatchRejectResultVisible(true);
      }
      
      if (failCount > 0) {
        message.error(`${failCount} 个请求处理失败，请检查日志并手动处理`);
      }
      
      // 清空选择并刷新数据
      setSelectedRowKeys([]);
      batchRemarkForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('批量拒绝处理失败:', error);
      message.error('批量拒绝处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理批量拒绝结果对话框的确认操作
  const handleBatchRejectResultOk = () => {
    setBatchRejectResultVisible(false);
    navigate('/members/add'); // 修正路径为'/members/add'而不是'/member/add'
  };

  // 处理批量拒绝结果对话框的取消操作
  const handleBatchRejectResultCancel = () => {
    setBatchRejectResultVisible(false);
  };

  // 留队申请相关函数
  const showStayDetail = (record: StayRequestItem) => {
    setCurrentStayRequest(record);
    setStayDetailVisible(true);
  };
  
  const showCreateStayModal = () => {
    createStayForm.resetFields();
    setSelectedMember(null);
    setCreateStayModalVisible(true);
  };

  const handleCreateStayCancel = () => {
    setCreateStayModalVisible(false);
  };

  const handleCreateStaySubmit = async () => {
    try {
      const values = await createStayForm.validateFields();
      setLoading(true);

      // 检查该成员是否已有有效的留队申请
      const hasValidStay = await stayService.checkValidStayRequest(values.memberId);
      
      if (hasValidStay) {
        message.error('该成员已有在有效期内的留队申请，不能重复申请');
        setLoading(false);
        return;
      }

      // 同时检查是否有待审批的留队申请
      const hasPendingRequest = await checkPendingStayRequest(values.memberId);
      
      if (hasPendingRequest) {
        message.error('该成员已有待审批的留队申请，不能重复申请');
        setLoading(false);
        return;
      }

      const stayData: Partial<StayRecord> = {
        memberId: values.memberId,
        reason: values.reason,
        date: new Date(),
        requestedValidUntil: values.validUntil.toDate()
      };

      await stayService.createStayRequest(stayData);
      
      message.success('留队请求已创建，等待审批');
      setCreateStayModalVisible(false);
      createStayForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('创建留队请求失败:', error);
      message.error('创建留队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveStay = async () => {
    try {
      if (!currentStayRequest) return;
      
      const values = await stayRemarkForm.validateFields();
      setLoading(true);
      
      // 更新留队记录状态为"已审批"，使用申请时设置的有效期
      await stayService.approveStayRequest(currentStayRequest.id, values.adminRemark);
      
      message.success('已审批通过留队请求');
      
      // 关闭详情模态框
      setStayDetailVisible(false);
      stayRemarkForm.resetFields();
      
      // 刷新数据
      fetchData();
    } catch (error) {
      console.error('审批留队请求失败:', error);
      message.error('审批留队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRejectStay = async () => {
    try {
      if (!currentStayRequest) return;
      
      const values = await stayRemarkForm.validateFields();
      setLoading(true);
      
      // 更新留队记录状态为"已拒绝"
      await stayService.rejectStayRequest(currentStayRequest.id, values.adminRemark);
      
      message.success('已拒绝留队请求');
      
      // 关闭详情模态框
      setStayDetailVisible(false);
      stayRemarkForm.resetFields();
      
      // 刷新数据
      fetchData();
    } catch (error) {
      console.error('拒绝留队请求失败:', error);
      message.error('拒绝留队请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 根据成员阶段返回对应的标签颜色
  const getStageTagColor = (stage: MemberStage) => {
    switch(stage) {
      case MemberStage.NEW_TRAINING_CANDIDATE:
        return 'geekblue';
      case MemberStage.NEW_TRAINING_INITIAL:
        return 'lime';
      case MemberStage.NEW_TRAINING_1:
        return 'cyan';
      case MemberStage.NEW_TRAINING_2:
        return 'cyan';
      case MemberStage.NEW_TRAINING_3:
        return 'cyan';
      case MemberStage.PURPLE_NIGHT:
        return 'purple';
      case MemberStage.NO_TRAINING:
        return 'orange';
      default:
        return 'blue';
    }
  };

  // 定义表格列
  const columns = [
    {
      title: '成员',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: QuitRequestItem) => (
        <Space>
          <span>{text}</span>
          {memberDict[record.memberId]?.blackpointCount >= 3 && (
            <Tooltip title="黑点数量已达到或超过3个">
              <ExclamationCircleOutlined style={{ color: 'red' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'QQ号',
      dataIndex: 'memberQQ',
      key: 'memberQQ',
    },
    {
      title: '申请日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: QuitRequestItem, b: QuitRequestItem) => 
        dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: '退队来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => getSourceTag(source),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: QuitRequestItem) => (
        record.isPending ? 
          <Tag color="processing">待审批</Tag> : 
          (record.isApproved ? 
            <Tag color="success">已批准</Tag> : 
            <Tag color="error">已拒绝</Tag>)
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: QuitRequestItem) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => showDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  // 定义留队申请表格列
  const stayColumns = [
    {
      title: '成员',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: StayRequestItem) => (
        <Space>
          <span>{text}</span>
          {memberDict[record.memberId]?.blackpointCount >= 3 && (
            <Tooltip title="黑点数量已达到或超过3个">
              <ExclamationCircleOutlined style={{ color: 'red' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'QQ号',
      dataIndex: 'memberQQ',
      key: 'memberQQ',
    },
    {
      title: '申请日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: StayRequestItem, b: StayRequestItem) => 
        dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: StayRequestItem) => (
        record.isPending ? 
          <Tag color="processing">待审批</Tag> : 
          (record.isApproved ? 
            <Tag color="success">已批准</Tag> : 
            <Tag color="error">已拒绝</Tag>)
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: StayRequestItem) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => showStayDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  // 添加表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    // 只允许选择待审批状态的记录
    getCheckboxProps: (record: QuitRequestItem) => ({
      disabled: !record.isPending,
      name: record.memberName,
    }),
  };

  // 定义留队记录表格列
  const validStayColumns = [
    {
      title: '成员',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: StayRequestItem) => (
        <Space>
          <span>{text}</span>
          {memberDict[record.memberId]?.blackpointCount >= 3 && (
            <Tooltip title="黑点数量已达到或超过3个">
              <ExclamationCircleOutlined style={{ color: 'red' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'QQ号',
      dataIndex: 'memberQQ',
      key: 'memberQQ',
    },
    {
      title: '阶段',
      key: 'stage',
      render: (_: unknown, record: StayRequestItem) => {
        const member = memberDict[record.memberId];
        if (!member) return <Tag color="default">未知</Tag>;
        
        return <Tag color={getStageTagColor(member.stage)}>{member.stage}</Tag>;
      }
    },
    {
      title: '最后新训日期',
      key: 'lastTrainingDate',
      render: (_: unknown, record: StayRequestItem) => {
        const member = memberDict[record.memberId];
        if (!member || !member.lastTrainingDate) return '无记录';
        
        return dayjs(member.lastTrainingDate).format('YYYY-MM-DD');
      }
    },
    {
      title: '留队原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '留队有效期至',
      key: 'validUntil',
      render: (_: unknown, record: StayRequestItem) => 
        record.validUntil ? 
          <Tag color="green" icon={<PushpinOutlined />}>
            {dayjs(record.validUntil).format('YYYY-MM-DD')}
          </Tag> : 
          '未设置',
      sorter: (a: StayRequestItem, b: StayRequestItem) => 
        (a.validUntil ? dayjs(a.validUntil).unix() : 0) - 
        (b.validUntil ? dayjs(b.validUntil).unix() : 0)
    },
    {
      title: '批准者备注',
      dataIndex: 'adminRemark',
      key: 'adminRemark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: StayRequestItem) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => showStayRecordDetail(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  // 留队记录相关函数
  const showStayRecordDetail = (record: StayRequestItem) => {
    setCurrentStayRecord(record);
    setStayRecordDetailVisible(true);
  };

  // 处理退队请求分页变化
  const handleQuitRequestsPaginationChange = (page: number, pageSize: number) => {
    setQuitRequestsPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };
  
  // 处理留队请求分页变化
  const handleStayRequestsPaginationChange = (page: number, pageSize: number) => {
    setStayRequestsPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };
  
  // 处理有效留队记录分页变化
  const handleValidStayRecordsPaginationChange = (page: number, pageSize: number) => {
    setValidStayRecordsPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };
  
  // 处理表格变化（排序、筛选等）
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    // 此处可以添加处理排序和筛选的逻辑
    console.log('表格变化:', { pagination, filters, sorter });
  };

  // 检查成员是否有待审批的留队申请
  const checkPendingStayRequest = async (memberId: string): Promise<boolean> => {
    try {
      const query = new AV.Query('StayRecord');
      query.equalTo('memberId', memberId);
      query.equalTo('isPending', true);
      const count = await query.count();
      return count > 0;
    } catch (error) {
      console.error('检查待审批留队请求失败:', error);
      // 如果是表不存在错误，返回false
      if (error instanceof Error && 
          (error.message.includes("Class or object doesn't exists") || 
           error.message.includes("404"))) {
        console.log('StayRecord表不存在，返回false');
        return false;
      }
      return false;
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeamOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
              <Title level={4} style={{ margin: 0 }}>退队/留队审批</Title>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={showCreateModal}
              >
                创建退队申请
              </Button>
              <Button 
                type="primary" 
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                icon={<PlusOutlined />} 
                onClick={showCreateStayModal}
              >
                创建留队申请
              </Button>
              {activeTabKey === '1' && (
                <>
                  <Button 
                    type="primary" 
                    danger
                    icon={<CheckCircleOutlined />}
                    onClick={showBatchApprove}
                    disabled={selectedRowKeys.length === 0}
                  >
                    批量批准
                  </Button>
                  <Button 
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={showBatchReject}
                    disabled={selectedRowKeys.length === 0}
                  >
                    批量拒绝
                  </Button>
                </>
              )}
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>
          
          <Divider />
          
          <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
            <TabPane tab="退队审批" key="1">
              <StandardTable
                pageId={QUIT_REQUESTS_PAGE_ID}
                rowSelection={rowSelection}
                columns={columns}
                dataSource={quitRequests}
                rowKey="id"
                loading={loading}
                onChange={handleTableChange}
                locale={{
                  emptyText: '暂无待审批的退队请求'
                }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6}>
                      <Space size="large">
                        <Badge status="processing" text={`待审批: ${quitRequests.length}`} />
                        <Badge status="default" text={`已选择: ${selectedRowKeys.length}`} />
                      </Space>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </TabPane>
            <TabPane tab="留队审批" key="2">
              <StandardTable
                pageId={STAY_REQUESTS_PAGE_ID}
                columns={stayColumns}
                dataSource={stayRequests}
                rowKey="id"
                loading={loading}
                onChange={handleTableChange}
                locale={{
                  emptyText: '暂无待审批的留队请求'
                }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Badge status="processing" text={`待审批: ${stayRequests.length}`} />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </TabPane>
            <TabPane tab="留队记录" key="3">
              <Alert
                message="说明"
                description="此页面显示所有有效期内的留队申请记录。有留队记录的成员不会因为未参加新训而被系统自动退队。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <StandardTable
                pageId={VALID_STAY_RECORDS_PAGE_ID}
                columns={validStayColumns}
                dataSource={validStayRecords}
                rowKey="id"
                loading={loadingStayRecords}
                onChange={handleTableChange}
                locale={{
                  emptyText: '暂无有效的留队记录'
                }}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={8}>
                      <Badge status="success" text={`有效留队: ${validStayRecords.length}`} />
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </TabPane>
          </Tabs>
        </Space>
      </Card>
      
      {/* 退队详情模态框 */}
      <Modal
        title="退队申请详情"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          remarkForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {currentRequest && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员: </Text>
                  <Text>{currentRequest.memberName}</Text>
                </div>
                <div>
                  <Text strong>QQ号: </Text>
                  <Text>{currentRequest.memberQQ}</Text>
                </div>
                <div>
                  <Text strong>黑点数量: </Text>
                  <Text style={{ 
                    color: memberDict[currentRequest.memberId]?.blackpointCount >= 3 ? 'red' : 
                           memberDict[currentRequest.memberId]?.blackpointCount > 0 ? 'orange' : 'green' 
                  }}>
                    {memberDict[currentRequest.memberId]?.blackpointCount || 0}
                  </Text>
                </div>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{memberDict[currentRequest.memberId]?.status}</Text>
                </div>
                <div>
                  <Text strong>成员阶段: </Text>
                  <Text>{memberDict[currentRequest.memberId]?.stage}</Text>
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">退队信息</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>申请日期: </Text>
                <Text>{dayjs(currentRequest.date).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>创建时间: </Text>
                <Text>{dayjs(currentRequest.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </div>
              <div>
                <Text strong>退队来源: </Text>
                {getSourceTag(currentRequest.source)}
                {currentRequest.isAutomatic && <Tag color="orange" style={{ marginLeft: 8 }}>自动生成</Tag>}
              </div>
              <div>
                <Text strong>退队原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {currentRequest.reason}
                </Paragraph>
              </div>
              
              <Alert
                message="请确认是否批准该退队申请"
                description="批准后，该成员将被从系统中永久删除，此操作无法撤销。"
                type="warning"
                showIcon
                style={{ marginTop: 16, marginBottom: 16 }}
              />
              
              <Form
                form={remarkForm}
                layout="vertical"
              >
                <Form.Item
                  name="adminRemark"
                  label="审批备注"
                  rules={[{ required: true, message: '请输入审批备注' }]}
                >
                  <TextArea 
                    placeholder="请输入审批备注，说明批准或拒绝的理由"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button 
                      onClick={() => {
                        setDetailVisible(false);
                        remarkForm.resetFields();
                      }}
                    >
                      取消
                    </Button>
                    <Popconfirm
                      title="确认拒绝"
                      description="确定要拒绝该退队申请吗？"
                      onConfirm={handleRejectQuit}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button 
                        danger
                        icon={<CloseCircleOutlined />}
                        loading={loading}
                      >
                        拒绝退队
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title="确认批准"
                      description="确定要批准该退队申请吗？批准后成员将被从系统中永久删除。"
                      onConfirm={handleApproveQuit}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button 
                        type="primary" 
                        icon={<CheckCircleOutlined />}
                        loading={loading}
                      >
                        批准退队
                      </Button>
                    </Popconfirm>
                  </Space>
                </Form.Item>
              </Form>
            </Space>
          </div>
        )}
      </Modal>

      {/* 创建退队申请模态框 */}
      <Modal
        title="创建退队申请"
        open={createModalVisible}
        onCancel={handleCreateCancel}
        footer={[
          <Button key="cancel" onClick={handleCreateCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleCreateSubmit}
          >
            提交
          </Button>
        ]}
      >
        <Form
          form={createForm}
          layout="vertical"
        >
          <Form.Item
            name="memberId"
            label="选择成员"
            rules={[{ required: true, message: '请选择成员' }]}
          >
            <Select
              placeholder="请选择成员"
              onChange={handleMemberChange}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {members
                .filter(member => member.status !== MemberStatus.QUIT)
                .map(member => (
                  <Option key={member.id} value={member.id}>
                    {member.nickname} - {member.qqNumber}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          {selectedMember && (
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{selectedMember.status}</Text>
                </div>
                <div>
                  <Text strong>黑点数量: </Text>
                  <Text style={{ 
                    color: selectedMember.blackpointCount >= 3 ? 'red' : 
                           selectedMember.blackpointCount > 0 ? 'orange' : 'green' 
                  }}>
                    {selectedMember.blackpointCount}
                  </Text>
                </div>
              </Space>
            </div>
          )}
          
          <Form.Item
            name="reason"
            label="退队原因"
            rules={[
              { required: true, message: '请输入退队原因' }
            ]}
          >
            <TextArea 
              placeholder="请输入退队原因，例如：个人原因、时间不足等"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量批准的确认模态框 */}
      <Modal
        title="批量批准退队申请"
        open={batchApproveVisible}
        onCancel={() => {
          setBatchApproveVisible(false);
          batchRemarkForm.resetFields();
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setBatchApproveVisible(false);
              batchRemarkForm.resetFields();
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={loading} 
            onClick={handleBatchApprove}
          >
            确认批准
          </Button>
        ]}
      >
        <Alert
          message={`您正在批量批准 ${selectedRowKeys.length} 条退队申请`}
          description="批准后，相关成员将被从系统中永久删除，包括成员信息和所有相关记录。此操作无法撤销！"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={batchRemarkForm}
          layout="vertical"
        >
          <Form.Item
            name="adminRemark"
            label="审批备注（将应用于所有选中的申请）"
            rules={[{ required: true, message: '请输入审批备注' }]}
          >
            <TextArea 
              placeholder="请输入批量批准的理由"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量拒绝的确认模态框 */}
      <Modal
        title="批量拒绝退队申请"
        open={batchRejectVisible}
        onCancel={() => {
          setBatchRejectVisible(false);
          batchRemarkForm.resetFields();
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setBatchRejectVisible(false);
              batchRemarkForm.resetFields();
            }}
          >
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={loading} 
            onClick={handleBatchReject}
          >
            确认拒绝
          </Button>
        ]}
      >
        <Alert
          message={`您正在批量拒绝 ${selectedRowKeys.length} 条退队申请`}
          description="拒绝后，相关成员仍将被从系统中删除，您将被引导至成员添加页面以重新添加成员。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={batchRemarkForm}
          layout="vertical"
        >
          <Form.Item
            name="adminRemark"
            label="审批备注（将应用于所有选中的申请）"
            rules={[{ required: true, message: '请输入审批备注' }]}
          >
            <TextArea 
              placeholder="请输入批量拒绝的理由"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 拒绝结果对话框 */}
      <Modal
        title="退队申请已拒绝"
        open={rejectResultVisible}
        onOk={handleRejectResultOk}
        onCancel={handleRejectResultCancel}
        okText="前往添加页面"
        cancelText="留在当前页面"
      >
        <p>{`已拒绝退队申请，但成员 ${rejectedMemberName} 及其所有相关记录已从系统中移除，请重新添加该成员。`}</p>
      </Modal>
      
      {/* 批量拒绝结果对话框 */}
      <Modal
        title="批量退队申请已拒绝"
        open={batchRejectResultVisible}
        onOk={handleBatchRejectResultOk}
        onCancel={handleBatchRejectResultCancel}
        okText="前往添加页面"
        cancelText="留在当前页面"
      >
        <p>{`已拒绝 ${batchSuccessCount} 个退队申请，相关成员及其所有记录已从系统中移除，如需重新添加请前往成员添加页面。`}</p>
      </Modal>

      {/* 留队申请详情模态框 */}
      <Modal
        title="留队申请详情"
        open={stayDetailVisible}
        onCancel={() => {
          setStayDetailVisible(false);
          stayRemarkForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {currentStayRequest && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员: </Text>
                  <Text>{currentStayRequest.memberName}</Text>
                </div>
                <div>
                  <Text strong>QQ号: </Text>
                  <Text>{currentStayRequest.memberQQ}</Text>
                </div>
                <div>
                  <Text strong>黑点数量: </Text>
                  <Text style={{ 
                    color: memberDict[currentStayRequest.memberId]?.blackpointCount >= 3 ? 'red' : 
                           memberDict[currentStayRequest.memberId]?.blackpointCount > 0 ? 'orange' : 'green' 
                  }}>
                    {memberDict[currentStayRequest.memberId]?.blackpointCount || 0}
                  </Text>
                </div>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{memberDict[currentStayRequest.memberId]?.status}</Text>
                </div>
                <div>
                  <Text strong>成员阶段: </Text>
                  <Text>{memberDict[currentStayRequest.memberId]?.stage}</Text>
                </div>
                <div>
                  <Text strong>最近新训日期: </Text>
                  <Text>{memberDict[currentStayRequest.memberId]?.lastTrainingDate ? 
                    dayjs(memberDict[currentStayRequest.memberId]?.lastTrainingDate).format('YYYY-MM-DD') : 
                    '无记录'}</Text>
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">留队信息</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>申请日期: </Text>
                <Text>{dayjs(currentStayRequest.date).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>创建时间: </Text>
                <Text>{dayjs(currentStayRequest.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </div>
              <div>
                <Text strong>留队原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {currentStayRequest.reason}
                </Paragraph>
              </div>
              
              <div>
                <Text strong>批准日期: </Text>
                <Text>{currentStayRequest.approvedAt ? 
                  dayjs(currentStayRequest.approvedAt).format('YYYY-MM-DD HH:mm:ss') : 
                  '未记录'}</Text>
              </div>
              <div>
                <Text strong>申请时有效期至: </Text>
                <Tag color="blue" icon={<PushpinOutlined />}>
                  {currentStayRequest.requestedValidUntil ? 
                    dayjs(currentStayRequest.requestedValidUntil).format('YYYY-MM-DD') : 
                    '未设置'}
                </Tag>
              </div>
              <div>
                <Text strong>批准后有效期至: </Text>
                <Tag color="green" icon={<PushpinOutlined />}>
                  {currentStayRequest.validUntil ? 
                    dayjs(currentStayRequest.validUntil).format('YYYY-MM-DD') : 
                    '未设置'}
                </Tag>
              </div>
              
              <Alert
                message="请确认是否批准该留队申请"
                description="批准后，该成员在有效期内将不会因为未参加新训而被系统自动移出。但黑点累计仍可能导致退队。"
                type="info"
                showIcon
                style={{ marginTop: 16, marginBottom: 16 }}
              />
              
              <Form
                form={stayRemarkForm}
                layout="vertical"
              >
                <Form.Item
                  name="adminRemark"
                  label="审批备注"
                  rules={[{ required: true, message: '请输入审批备注' }]}
                >
                  <TextArea 
                    placeholder="请输入审批备注，说明批准或拒绝的理由"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                </Form.Item>
                
                <Form.Item>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button 
                      onClick={() => {
                        setStayDetailVisible(false);
                        stayRemarkForm.resetFields();
                      }}
                    >
                      取消
                    </Button>
                    <Popconfirm
                      title="确认拒绝"
                      description="确定要拒绝该留队申请吗？"
                      onConfirm={handleRejectStay}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button 
                        danger
                        icon={<CloseCircleOutlined />}
                        loading={loading}
                      >
                        拒绝申请
                      </Button>
                    </Popconfirm>
                    <Popconfirm
                      title="确认批准"
                      description="确定要批准该留队申请吗？批准后该成员在有效期内不会因未参加新训而被系统自动退队。"
                      onConfirm={handleApproveStay}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button 
                        type="primary" 
                        icon={<CheckCircleOutlined />}
                        loading={loading}
                      >
                        批准申请
                      </Button>
                    </Popconfirm>
                  </Space>
                </Form.Item>
              </Form>
            </Space>
          </div>
        )}
      </Modal>

      {/* 创建留队申请模态框 */}
      <Modal
        title="创建留队申请"
        open={createStayModalVisible}
        onCancel={handleCreateStayCancel}
        footer={[
          <Button key="cancel" onClick={handleCreateStayCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleCreateStaySubmit}
          >
            提交
          </Button>
        ]}
      >
        <Form
          form={createStayForm}
          layout="vertical"
          initialValues={{ validUntil: dayjs().add(30, 'day') }}
        >
          <Form.Item
            name="memberId"
            label="选择成员"
            rules={[{ required: true, message: '请选择成员' }]}
          >
            <Select
              placeholder="请选择成员"
              onChange={handleMemberChange}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="children"
            >
              {members
                .filter(member => member.status !== MemberStatus.QUIT)
                .map(member => (
                  <Option key={member.id} value={member.id}>
                    {member.nickname} - {member.qqNumber}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          
          {selectedMember && (
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{selectedMember.status}</Text>
                </div>
                <div>
                  <Text strong>最近新训日期: </Text>
                  <Text>{selectedMember.lastTrainingDate ? 
                    dayjs(selectedMember.lastTrainingDate).format('YYYY-MM-DD') : 
                    '无记录'}</Text>
                </div>
                <div>
                  <Text strong>黑点数量: </Text>
                  <Text style={{ 
                    color: selectedMember.blackpointCount >= 3 ? 'red' : 
                           selectedMember.blackpointCount > 0 ? 'orange' : 'green' 
                  }}>
                    {selectedMember.blackpointCount}
                  </Text>
                </div>
              </Space>
            </div>
          )}
          
          <Form.Item
            name="validUntil"
            label="请求有效期至"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker 
              placeholder="请选择申请的留队有效期"
              format="YYYY-MM-DD"
              disabledDate={(current) => !!current && current < dayjs().startOf('day')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="留队原因"
            rules={[
              { required: true, message: '请输入留队原因' }
            ]}
          >
            <TextArea 
              placeholder="请输入留队原因，例如：时间原因无法参加新训、外出交流等"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 留队记录详情模态框 */}
      <Modal
        title="留队记录详情"
        open={stayRecordDetailVisible}
        onCancel={() => {
          setStayRecordDetailVisible(false);
        }}
        footer={[
          <Button 
            key="close" 
            onClick={() => setStayRecordDetailVisible(false)}
          >
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentStayRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员: </Text>
                  <Text>{currentStayRecord.memberName}</Text>
                </div>
                <div>
                  <Text strong>QQ号: </Text>
                  <Text>{currentStayRecord.memberQQ}</Text>
                </div>
                <div>
                  <Text strong>黑点数量: </Text>
                  <Text style={{ 
                    color: memberDict[currentStayRecord.memberId]?.blackpointCount >= 3 ? 'red' : 
                           memberDict[currentStayRecord.memberId]?.blackpointCount > 0 ? 'orange' : 'green' 
                  }}>
                    {memberDict[currentStayRecord.memberId]?.blackpointCount || 0}
                  </Text>
                </div>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{memberDict[currentStayRecord.memberId]?.status}</Text>
                </div>
                <div>
                  <Text strong>成员阶段: </Text>
                  <Text>{memberDict[currentStayRecord.memberId]?.stage}</Text>
                </div>
                <div>
                  <Text strong>最近新训日期: </Text>
                  <Text>{memberDict[currentStayRecord.memberId]?.lastTrainingDate ? 
                    dayjs(memberDict[currentStayRecord.memberId]?.lastTrainingDate).format('YYYY-MM-DD') : 
                    '无记录'}</Text>
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">留队信息</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>申请日期: </Text>
                <Text>{dayjs(currentStayRecord.date).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>批准日期: </Text>
                <Text>{currentStayRecord.approvedAt ? 
                  dayjs(currentStayRecord.approvedAt).format('YYYY-MM-DD HH:mm:ss') : 
                  '未记录'}</Text>
              </div>
              <div>
                <Text strong>留队有效期至: </Text>
                <Tag color="green" icon={<PushpinOutlined />}>
                  {currentStayRecord.validUntil ? 
                    dayjs(currentStayRecord.validUntil).format('YYYY-MM-DD') : 
                    '未设置'}
                </Tag>
              </div>
              <div>
                <Text strong>留队原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {currentStayRecord.reason}
                </Paragraph>
              </div>
              {currentStayRecord.adminRemark && (
                <div>
                  <Text strong>批准者备注: </Text>
                  <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                    {currentStayRecord.adminRemark}
                  </Paragraph>
                </div>
              )}
              
              <Alert
                message="留队记录状态"
                description="该留队申请已被批准，成员在有效期内不会因为未参加新训而被系统自动移出。"
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuitApproval; 