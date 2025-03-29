import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Dropdown,
  Modal,
  Typography,
  Divider,
  Select,
  Tooltip,
  Form,
  DatePicker,
  Upload,
  Alert,
  message,
  Tabs,
  Descriptions,
  Badge,
  Checkbox,
  Progress,
  Menu,
  Radio,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  TeamOutlined, 
  MoreOutlined, 
  EditOutlined,
  CalendarOutlined,
  ExceptionOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  ReloadOutlined,
  PlusOutlined,
  FileExcelOutlined,
  UploadOutlined,
  InboxOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PushpinOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  UserOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { Member, MemberStage, MemberStatus } from '../types/member';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { memberService, blackpointService } from '../utils/leancloud';
import AV from 'leancloud-storage';
import locale from 'antd/es/date-picker/locale/zh_CN';
import * as XLSX from 'xlsx';
import { useMessage } from '../utils/messageUtil';
import { getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

// 添加需要排除的QQ号列表
const EXCLUDED_QQ_NUMBERS = [
  '3240489407',
  '523014995',
  '1004454352',
  '787740546',
  '563844230',
  '1712009689',
  '2854196310',
  '2733539510',
  '2024342436',
  '3464547914',
  '2893084340'
];

// 扩展Member接口以包含留队信息
interface MemberWithStay extends Member {
  hasValidStay?: boolean;
  stayValidUntil?: Date;
}

// 页面唯一标识，用于缓存分页设置
const PAGE_ID = 'member_list';

const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [stageFilter, setStageFilter] = useState<MemberStage | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const navigate = useNavigate();
  const message = useMessage();

  // 新训日期选择相关状态
  const [trainingDateModalVisible, setTrainingDateModalVisible] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [currentMemberName, setCurrentMemberName] = useState<string>('');
  const [selectedTrainingDate, setSelectedTrainingDate] = useState<dayjs.Dayjs>(dayjs());

  // 新增状态用于控制确认模态框
  const [updateTrainingConfirmVisible, setUpdateTrainingConfirmVisible] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string>('');
  const [updatingMemberNickname, setUpdatingMemberNickname] = useState<string>('');

  // 编辑成员相关状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form] = Form.useForm();

  // 添加黑点相关状态
  const [blackpointModalVisible, setBlackpointModalVisible] = useState(false);
  const [blackpointMember, setBlackpointMember] = useState<Member | null>(null);
  const [blackpointReason, setBlackpointReason] = useState('');
  const [blackpointRegistrar, setBlackpointRegistrar] = useState('');

  // 请假相关状态
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveMember, setLeaveMember] = useState<Member | null>(null);
  const [leaveForm] = Form.useForm();
  
  // 退队相关状态
  const [quitModalVisible, setQuitModalVisible] = useState(false);
  const [quitMember, setQuitMember] = useState<Member | null>(null);
  const [quitReason, setQuitReason] = useState('');

  // 查看详情相关状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailMember, setDetailMember] = useState<MemberWithStay | null>(null);
  // 添加请假记录和黑点记录状态
  const [memberLeaveRecords, setMemberLeaveRecords] = useState<any[]>([]);
  const [memberBlackpointRecords, setMemberBlackpointRecords] = useState<any[]>([]);

  // 导入相关状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(0);
  const [importError, setImportError] = useState(0);
  const [importErrorMsg, setImportErrorMsg] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);
  // 添加导入进度状态
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  // 添加分页状态
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(PAGE_ID),
    total: 0,
  }));

  // 添加排序状态
  const [sortInfo, setSortInfo] = useState<{
    field: string | null;
    order: 'ascend' | 'descend' | null;
  }>({
    field: null,
    order: null
  });

  // 添加确认移除成员的模态框
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);

  // 获取成员列表
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await memberService.getAllMembers();
      const formattedMembers = result.map((item: any) => ({
        key: item.id,
        id: item.id,
        nickname: item.get('nickname'),
        qqNumber: item.get('qqNumber'),
        gameId: item.get('gameId'),
        joinDate: item.get('joinDate'),
        stage: item.get('stage'),
        status: item.get('status'),
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false,
        lastTrainingDate: item.get('lastTrainingDate'),
        remark: item.get('remark') || '',
        createdAt: item.createdAt,
        hasValidStay: false, // 默认为 false
        stayValidUntil: undefined
      }));
      
      setMembers(formattedMembers);
      // 更新分页总数
      setPagination(prev => ({
        ...prev,
        total: formattedMembers.length
      }));
      console.log('成员列表加载完成', formattedMembers);
    } catch (error) {
      console.error('获取成员列表失败:', error);
      message.error('获取成员列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    fetchMembers();
  }, []);

  // 刷新数据
  const handleRefresh = () => {
    fetchMembers();
    message.success('数据已刷新');
  };

  // 获取阶段标签颜色
  const getStageTagColor = (stage: MemberStage) => {
    switch (stage) {
      case MemberStage.PURPLE_NIGHT:
        return 'purple';
      case MemberStage.NEW_TRAINING_CANDIDATE:
        return 'geekblue';
      case MemberStage.NEW_TRAINING_3:
        return 'blue';
      case MemberStage.NEW_TRAINING_2:
        return 'cyan';
      case MemberStage.NEW_TRAINING_1:
        return 'green';
      case MemberStage.NEW_TRAINING_INITIAL:
        return 'lime';
      case MemberStage.NO_TRAINING:
        return 'orange';
      default:
        return 'default';
    }
  };

  // 获取状态标签颜色
  const getStatusTagColor = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.NORMAL:
        return 'green';
      case MemberStatus.ON_LEAVE:
        return 'orange';
      case MemberStatus.QUIT:
        return 'red';
      default:
        return 'default';
    }
  };

  // 搜索和筛选
  const getFilteredMembers = () => {
    let result = members.filter(member => {
      const matchesSearch = 
        searchText === '' || 
        member.nickname.toLowerCase().includes(searchText.toLowerCase()) ||
        member.qqNumber.includes(searchText) ||
        (member.gameId && member.gameId.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesStage = stageFilter === 'all' || member.stage === stageFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      
      return matchesSearch && matchesStage && matchesStatus;
    });

    // 应用排序
    if (sortInfo.field && sortInfo.order) {
      result = [...result].sort((a, b) => {
        const fieldA = a[sortInfo.field as keyof Member];
        const fieldB = b[sortInfo.field as keyof Member];
        
        // 日期类型的特殊处理
        if (sortInfo.field === 'joinDate' || sortInfo.field === 'lastTrainingDate') {
          // 安全处理日期值
          const dateA = fieldA instanceof Date 
            ? fieldA.getTime() 
            : typeof fieldA === 'string' && fieldA 
              ? new Date(fieldA).getTime() 
              : 0;
              
          const dateB = fieldB instanceof Date 
            ? fieldB.getTime() 
            : typeof fieldB === 'string' && fieldB 
              ? new Date(fieldB).getTime() 
              : 0;
          
          return sortInfo.order === 'ascend' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        
        // 字符串类型的处理
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          return sortInfo.order === 'ascend' 
            ? fieldA.localeCompare(fieldB) 
            : fieldB.localeCompare(fieldA);
        }
        
        // 数字类型的处理
        if (typeof fieldA === 'number' && typeof fieldB === 'number') {
          return sortInfo.order === 'ascend' 
            ? fieldA - fieldB 
            : fieldB - fieldA;
        }
        
        return 0;
      });
    }
    
    return result;
  };

  // 更新训练日期
  const handleUpdateTrainingDate = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      message.error('未找到该成员');
      return;
    }
    
    // 设置当前操作的成员信息
    setUpdatingMemberId(memberId);
    setUpdatingMemberNickname(member.nickname);
    setUpdateTrainingConfirmVisible(true);
  };
  
  // 确认设置为今日新训
  const confirmUpdateTraining = async () => {
    if (!updatingMemberId) return;
    
    try {
      setLoading(true);
      // 使用原生 JavaScript Date 对象
      const jsDate = new Date();
      
      // 查找当前成员，判断是否需要更新阶段
      const currentMember = members.find(m => m.id === updatingMemberId);
      if (!currentMember) {
        message.error('未找到该成员');
        return;
      }
      
      // 更新数据对象
      const updateData: any = {
        lastTrainingDate: jsDate,
      };
      
      // 如果成员之前没有参加过新训，则将其阶段设置为新训初期
      if (currentMember.stage === MemberStage.NO_TRAINING) {
        updateData.stage = MemberStage.NEW_TRAINING_INITIAL;
        message.info(`${updatingMemberNickname} 的阶段已自动更新为"${MemberStage.NEW_TRAINING_INITIAL}"`);
      }
      
      await memberService.updateMember(updatingMemberId, updateData);
      message.success(`${updatingMemberNickname} 的新训日期已更新为今天`);
      fetchMembers(); // 刷新列表数据
    } catch (error) {
      console.error('更新新训日期失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
      setUpdateTrainingConfirmVisible(false);
      setUpdatingMemberId('');
      setUpdatingMemberNickname('');
    }
  };
  
  // 取消设置今日新训
  const cancelUpdateTraining = () => {
    setUpdateTrainingConfirmVisible(false);
    setUpdatingMemberId('');
    setUpdatingMemberNickname('');
  };

  // 显示新训日期选择模态框
  const showTrainingDateModal = (member: Member) => {
    setCurrentMemberId(member.id);
    setCurrentMemberName(member.nickname);
    setSelectedTrainingDate(dayjs()); // 默认为当前日期
    setTrainingDateModalVisible(true);
  };

  // 取消更新新训日期
  const handleTrainingDateCancel = () => {
    setTrainingDateModalVisible(false);
    setCurrentMemberId('');
    setCurrentMemberName('');
  };

  // 确认更新新训日期
  const handleTrainingDateSubmit = async () => {
    if (!currentMemberId) return;
    
    try {
      setLoading(true);
      // 使用原生 JavaScript Date 对象
      const jsDate = selectedTrainingDate.toDate();
      
      // 查找当前成员，判断是否需要更新阶段
      const currentMember = members.find(m => m.id === currentMemberId);
      if (!currentMember) {
        message.error('未找到该成员');
        return;
      }
      
      // 更新数据对象
      const updateData: any = {
        lastTrainingDate: jsDate,
      };
      
      // 如果成员之前没有参加过新训，则将其阶段设置为新训初期
      if (currentMember.stage === MemberStage.NO_TRAINING) {
        updateData.stage = MemberStage.NEW_TRAINING_INITIAL;
        message.info(`${currentMemberName} 的阶段已自动更新为"${MemberStage.NEW_TRAINING_INITIAL}"`);
      }
      
      await memberService.updateMember(currentMemberId, updateData);
      message.success(`${currentMemberName} 的新训日期已更新`);
      setTrainingDateModalVisible(false);
      fetchMembers(); // 刷新列表数据
    } catch (error) {
      console.error('更新新训日期失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 添加黑点
  const handleAddBlackpoint = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      message.error('未找到该成员');
      return;
    }
    
    setBlackpointMember(member);
    setBlackpointReason('');
    setBlackpointRegistrar(''); // 重置登记人
    setBlackpointModalVisible(true);
  };
  
  // 取消添加黑点
  const handleBlackpointCancel = () => {
    setBlackpointModalVisible(false);
    setBlackpointMember(null);
    setBlackpointReason('');
    setBlackpointRegistrar(''); // 清空登记人
  };
  
  // 确认添加黑点
  const handleBlackpointSubmit = async () => {
    try {
      if (!blackpointMember) return;
      
      // 添加必填验证
      if (!blackpointReason.trim()) {
        message.error('请输入黑点原因');
        return;
      }
      
      // 验证登记人
      if (!blackpointRegistrar.trim()) {
        message.error('请输入登记人');
        return;
      }
      
      setLoading(true);
      
      // 更新成员的黑点计数
      const blackpointCount = (blackpointMember.blackpointCount || 0) + 1;
      
      // 构建更新数据
      const updateData: any = {
        blackpointCount: blackpointCount
      };
      
      // 如果有黑点原因，添加到备注中
      if (blackpointReason) {
        const currentRemark = blackpointMember.remark || '';
        const newRemark = currentRemark 
          ? `${currentRemark}\n${dayjs().format('YYYY-MM-DD')} 黑点: ${blackpointReason} (登记人: ${blackpointRegistrar})`
          : `${dayjs().format('YYYY-MM-DD')} 黑点: ${blackpointReason} (登记人: ${blackpointRegistrar})`;
        updateData.remark = newRemark;
      }
      
      // 更新成员信息
      await memberService.updateMember(blackpointMember.id, updateData);
      
      // 创建黑点记录（使用服务方法）
      await blackpointService.createBlackpoint({
        memberId: blackpointMember.id,
        reason: blackpointReason,
        date: new Date(),
        isActive: true,
        registrar: blackpointRegistrar // 添加登记人信息
      });
      
      // 如果黑点达到4个，需要发送到退队审批
      if (blackpointCount >= 4) {
        // 准备退队记录数据
        const quitRequestData = {
          memberId: blackpointMember.id,
          reason: `黑点累计达到${blackpointCount}个，系统自动创建退队申请。最近一次黑点原因：${blackpointReason}`,
          date: new Date(),
          isAutomatic: true,
          source: 'blackpoint',
          isPending: true // 设置为待审核状态
        };
        
        // 创建退队记录
        const QuitRecordClass = AV.Object.extend('QuitRecord');
        const record = new QuitRecordClass();
        
        Object.entries(quitRequestData).forEach(([key, value]) => {
          record.set(key, value);
        });
        
        await record.save();
        
        // 同时更新成员状态为"已退队"
        await memberService.updateMember(blackpointMember.id, {
          status: MemberStatus.QUIT,
          // 添加额外的备注说明
          remark: updateData.remark + "\n系统说明：由于黑点数量达到4个，状态已自动更新为已退队"
        });
        
        message.warning(`${blackpointMember.nickname} 黑点已达到${blackpointCount}个，系统已将其加入退队审批名单并更新状态为"已退队"`);
      }
      
      message.success(`已为 ${blackpointMember.nickname} 添加黑点，当前黑点数: ${blackpointCount}`);
      
      // 关闭模态框
      setBlackpointModalVisible(false);
      setBlackpointReason('');
      setBlackpointRegistrar('');
      
      // 重新获取成员列表
      fetchMembers();
    } catch (error) {
      console.error('添加黑点失败:', error);
      message.error('添加黑点失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 登记请假
  const handleRegisterLeave = (memberId: string) => {
    try {
      console.log('handleRegisterLeave 被调用，memberId:', memberId);
      const member = members.find(m => m.id === memberId);
      if (!member) {
        message.error('未找到该成员');
        return;
      }
      
      console.log('设置请假成员:', member.nickname);
      setLeaveMember(member);
      
      console.log('重置表单');
      leaveForm.resetFields();
      leaveForm.setFieldsValue({
        startDate: dayjs(),
        endDate: dayjs().add(7, 'day')
      });
      
      console.log('显示请假模态框');
      setLeaveModalVisible(true);
      
      // 额外确认模态框是否显示
      setTimeout(() => {
        console.log('请假模态框状态:', leaveModalVisible);
      }, 100);
    } catch (error) {
      console.error('登记请假操作出错:', error);
      message.error('操作失败，请重试');
    }
  };
  
  // 取消请假登记
  const handleLeaveCancel = () => {
    setLeaveModalVisible(false);
    setLeaveMember(null);
    leaveForm.resetFields();
  };
  
  // 确认请假登记
  const handleLeaveSubmit = async () => {
    if (!leaveMember) return;
    
    try {
      const values = await leaveForm.validateFields();
      setLoading(true);
      
      // 更新成员状态为请假
      const updateData: any = {
        status: MemberStatus.ON_LEAVE,
      };
      
      // 更新备注信息，添加请假记录
      const leaveRecord = `${dayjs().format('YYYY-MM-DD')} 请假: ${values.startDate.format('YYYY-MM-DD')}至${values.endDate.format('YYYY-MM-DD')}, 原因: ${values.reason}`;
      const currentRemark = leaveMember.remark || '';
      const newRemark = currentRemark ? `${currentRemark}\n${leaveRecord}` : leaveRecord;
      updateData.remark = newRemark;
      
      // 1. 更新成员状态
      await memberService.updateMember(leaveMember.id, updateData);
      
      // 2. 创建请假记录 - 添加此部分
      const LeaveRecordClass = AV.Object.extend('LeaveRecord');
      const record = new LeaveRecordClass();
      record.set('memberId', leaveMember.id);
      record.set('reason', values.reason);
      record.set('startDate', values.startDate.toDate());
      record.set('endDate', values.endDate.toDate());
      record.set('status', 'active'); // 设置为活跃状态
      await record.save();
      
      message.success(`${leaveMember.nickname} 请假已登记，状态已更新为"请假中"`);
      setLeaveModalVisible(false);
      setLeaveMember(null);
      leaveForm.resetFields();
      fetchMembers(); // 刷新列表
    } catch (error) {
      console.error('登记请假失败:', error);
      message.error('登记失败，请检查表单填写是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 退队处理
  const handleQuit = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      message.error('未找到该成员');
      return;
    }
    
    setQuitMember(member);
    setQuitReason('');
    setQuitModalVisible(true);
  };
  
  // 取消退队处理
  const handleQuitCancel = () => {
    setQuitModalVisible(false);
    setQuitMember(null);
    setQuitReason('');
  };
  
  // 确认退队处理 - 修改为创建退队审批记录
  const handleQuitSubmit = async () => {
    if (!quitMember) return;
    
    try {
      setLoading(true);
      
      // 准备退队记录数据
      const quitRequestData = {
        memberId: quitMember.id,
        reason: quitReason || `手动创建的退队审批 - ${quitMember.nickname}`,
        date: new Date(),
        isAutomatic: false,
        source: 'manual',
        isPending: true // 设置为待审核状态
      };
      
      // 创建退队记录
      const QuitRecordClass = AV.Object.extend('QuitRecord');
      const record = new QuitRecordClass();
      
      Object.entries(quitRequestData).forEach(([key, value]) => {
        record.set(key, value);
      });
      
      await record.save();
      
      // 同时更新成员状态为"已退队"
      await memberService.updateMember(quitMember.id, {
        status: MemberStatus.QUIT,
        // 更新备注，添加退队原因
        remark: quitMember.remark 
          ? `${quitMember.remark}\n${dayjs().format('YYYY-MM-DD')} 退队: ${quitReason}`
          : `${dayjs().format('YYYY-MM-DD')} 退队: ${quitReason}`
      });
      
      message.success(`${quitMember.nickname} 的退队申请已创建，状态已更新为"已退队"`);
      setQuitModalVisible(false);
      setQuitMember(null);
      setQuitReason('');
      fetchMembers(); // 刷新列表
    } catch (error) {
      console.error('创建退队申请失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查看成员详情并检查留队状态
  const handleViewDetail = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      message.error('未找到该成员');
      return;
    }
    
    try {
      // 检查是否有有效的留队申请
      let hasValidStay = false;
      let stayValidUntil = undefined;
      
      try {
        const query = new AV.Query('StayRecord');
        query.equalTo('memberId', memberId);
        query.equalTo('isApproved', true);
        query.greaterThan('validUntil', new Date());
        const stayRecords = await query.find();
        
        if (stayRecords.length > 0) {
          hasValidStay = true;
          // 如果有多个有效的留队申请，取最晚的有效期
          stayValidUntil = stayRecords.reduce((latest: Date | undefined, record) => {
            const validUntil = record.get('validUntil');
            return !latest || validUntil > latest ? validUntil : latest;
          }, undefined);
        }
      } catch (error) {
        console.error('获取留队申请失败:', error);
        // 如果发生错误，不影响显示详情
      }
      
      // 获取请假记录
      let leaveRecords: any[] = [];
      try {
        const leaveQuery = new AV.Query('LeaveRecord');
        leaveQuery.equalTo('memberId', memberId);
        leaveQuery.descending('createdAt'); // 按创建时间降序排列
        leaveQuery.limit(10); // 最多显示10条记录
        const leaveResults = await leaveQuery.find();
        
        leaveRecords = leaveResults.map(record => ({
          id: record.id,
          startDate: record.get('startDate'),
          endDate: record.get('endDate'),
          reason: record.get('reason'),
          status: record.get('status'),
          createdAt: record.createdAt
        }));
      } catch (error) {
        console.error('获取请假记录失败:', error);
      }
      
      // 获取黑点记录
      let blackpointRecords: any[] = [];
      try {
        const blackpointQuery = new AV.Query('Blackpoint');
        blackpointQuery.equalTo('memberId', memberId);
        blackpointQuery.descending('createdAt'); // 按创建时间降序排列
        blackpointQuery.limit(10); // 最多显示10条记录
        const blackpointResults = await blackpointQuery.find();
        
        blackpointRecords = blackpointResults.map(record => ({
          id: record.id,
          reason: record.get('reason'),
          date: record.get('date'),
          isActive: record.get('isActive'),
          createdAt: record.createdAt
        }));
      } catch (error) {
        console.error('获取黑点记录失败:', error);
      }
      
      // 设置带有留队信息的成员对象
      const memberWithStay = {
        ...member,
        hasValidStay,
        stayValidUntil
      };
      
      setDetailMember(memberWithStay);
      setMemberLeaveRecords(leaveRecords);
      setMemberBlackpointRecords(blackpointRecords);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('获取成员详情失败:', error);
      message.error('获取成员详情失败');
    }
  };
  
  // 关闭详情模态框
  const handleDetailCancel = () => {
    setDetailModalVisible(false);
    setDetailMember(null);
    setMemberLeaveRecords([]);
    setMemberBlackpointRecords([]);
  };

  // 打开编辑模态框
  const showEditModal = (member: Member) => {
    setEditingMember(member);
    
    form.setFieldsValue({
      ...member,
      joinDate: member.joinDate ? dayjs(member.joinDate) : null,
      lastTrainingDate: member.lastTrainingDate ? dayjs(member.lastTrainingDate) : null,
    });
    setEditModalVisible(true);
  };

  // 处理新训日期变化
  const handleLastTrainingDateChange = (date: dayjs.Dayjs | null) => {
    // 如果选择了日期，并且当前阶段是"未新训"，则自动更新为"新训初期"
    const currentStage = form.getFieldValue('stage');
    if (date && currentStage === MemberStage.NO_TRAINING) {
      form.setFieldsValue({ stage: MemberStage.NEW_TRAINING_INITIAL });
      message.info('由于设置了最后新训日期，阶段已自动更新为"新训初期"');
    }
  };

  // 处理阶段变化
  const handleStageChange = (value: MemberStage) => {
    // 如果选择了"未新训"阶段，但已有新训日期，则不允许选择
    const lastTrainingDate = form.getFieldValue('lastTrainingDate');
    if (value === MemberStage.NO_TRAINING && lastTrainingDate) {
      message.warning('已有新训记录的成员不能设置为"未新训"阶段');
      // 回退到之前的阶段选择
      form.setFieldsValue({ stage: MemberStage.NEW_TRAINING_INITIAL });
    }
  };

  // 取消编辑
  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditingMember(null);
    form.resetFields();
  };

  // 保存编辑
  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      if (!editingMember) return;

      setLoading(true);
      const updatedData = {
        ...values,
        joinDate: values.joinDate ? values.joinDate.toDate() : null,
        lastTrainingDate: values.lastTrainingDate ? values.lastTrainingDate.toDate() : null,
      };

      await memberService.updateMember(editingMember.id, updatedData);
      message.success('成员信息更新成功');
      setEditModalVisible(false);
      fetchMembers(); // 刷新列表
    } catch (error) {
      console.error('更新成员信息失败:', error);
      message.error('更新失败，请检查表单填写是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 显示导入模态框
  const showImportModal = () => {
    setImportModalVisible(true);
    setPreviewData([]);
    setImportFile(null);
    setImportSuccess(0);
    setImportError(0);
    setImportErrorMsg([]);
  };

  // 取消导入
  const handleImportCancel = () => {
    setImportModalVisible(false);
  };

  // 处理文件上传
  const handleFileChange = (info: any) => {
    console.log('handleFileChange 被触发', info);
    
    if (info.file.status === 'uploading') {
      console.log('文件上传中...');
      return;
    }
    
    if (info.file.status === 'done' || info.file.status === 'error') {
      console.log('文件状态:', info.file.status);
      return;
    }
    
    const file = info.file.originFileObj;
    if (!file) {
      console.error('未能获取到文件对象');
      message.error('文件处理失败，请重试或尝试使用其他浏览器');
      return;
    }
    
    console.log('文件对象:', file.name, file.type, file.size);
    setImportFile(file);
    
    // 根据文件类型选择解析方法
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      console.log('解析CSV文件');
      parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      console.log('解析Excel文件');
      parseExcel(file);
    } else {
      console.log('不支持的文件类型');
      message.error('不支持的文件格式，请上传CSV或Excel文件');
    }
  };

  // 解析CSV文件
  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // 移除第一行（标题行）
        if (lines.length > 0) {
          lines.shift();
        }
        
        const parsedData: any[] = [];
        const errorRows: number[] = [];
        const excludedRows: number[] = [];
        
        // 解析每一行数据
        lines.forEach((line, index) => {
          if (!line.trim()) return; // 跳过空行
          
          const columns = line.split(',');
          if (columns.length < 3) {
            errorRows.push(index + 2);
            return;
          }
          
          // 清理数据（移除引号和多余空格）
          const nickname = columns[0].trim().replace(/^["']|["']$/g, '');
          const qqNumber = columns[1].trim().replace(/^["']|["']$/g, '');
          const joinDateStr = columns[2].trim().replace(/^["']|["']$/g, '');
          
          // 检查是否在排除QQ号列表中
          if (EXCLUDED_QQ_NUMBERS.includes(qqNumber)) {
            excludedRows.push(index + 2);
            return;
          }
          
          // 检查QQ号格式
          if (!qqNumber || !/^\d{5,11}$/.test(qqNumber)) {
            errorRows.push(index + 2);
            return;
          }
          
          // 尝试转换日期
          let joinDate;
          try {
            joinDate = dayjs(joinDateStr);
            if (!joinDate.isValid()) {
              joinDate = dayjs();
            }
          } catch (error) {
            joinDate = dayjs();
          }
          
          // 添加到预览数据
          parsedData.push({
            nickname,
            qqNumber,
            joinDate,
            key: index
          });
        });
        
        setPreviewData(parsedData);
        
        if (errorRows.length > 0) {
          const rowsList = errorRows.length > 3 
            ? `${errorRows.slice(0, 3).join(', ')} 等 ${errorRows.length} 行` 
            : errorRows.join(', ');
          message.warning(`发现 ${errorRows.length} 行数据格式有误，已跳过（行号：${rowsList}）`);
        }
        
        if (excludedRows.length > 0) {
          const rowsList = excludedRows.length > 3 
            ? `${excludedRows.slice(0, 3).join(', ')} 等 ${excludedRows.length} 行` 
            : excludedRows.join(', ');
          message.info(`已自动过滤 ${excludedRows.length} 行不需要导入的QQ号（行号：${rowsList}）`);
        }
        
        if (parsedData.length === 0) {
          message.error('未找到有效数据，请检查文件格式');
        } else {
          message.success(`成功解析 ${parsedData.length} 条数据`);
        }
      } catch (error) {
        console.error('解析CSV文件失败:', error);
        message.error('解析CSV文件失败，请检查文件格式');
      }
    };
    
    reader.readAsText(file);
  };

  // 解析Excel文件
  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 将Excel转换为JSON格式
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 移除标题行
        if (jsonData.length > 0) {
          jsonData.shift();
        }
        
        const parsedData: any[] = [];
        const errorRows: number[] = [];
        const excludedRows: number[] = [];
        
        // 解析每一行数据
        jsonData.forEach((row, index) => {
          if (!row || row.length < 3) {
            errorRows.push(index + 2);
            return; // 跳过不完整的行
          }
          
          const nickname = String(row[0] || '').trim();
          const qqNumber = String(row[1] || '').trim();
          const joinDateStr = row[2];
          
          if (!nickname || !qqNumber) {
            errorRows.push(index + 2);
            return;
          }
          
          // 检查是否在排除QQ号列表中
          if (EXCLUDED_QQ_NUMBERS.includes(qqNumber)) {
            excludedRows.push(index + 2);
            return;
          }
          
          // 检查QQ号格式
          if (!/^\d{5,11}$/.test(qqNumber)) {
            errorRows.push(index + 2);
            return;
          }
          
          // 尝试转换日期
          let joinDate;
          try {
            if (typeof joinDateStr === 'string') {
              joinDate = dayjs(joinDateStr);
            } else if (typeof joinDateStr === 'number') {
              // Excel日期是从1900年1月0日开始的天数
              joinDate = dayjs(XLSX.SSF.parse_date_code(joinDateStr));
            } else {
              joinDate = dayjs();
            }
            
            if (!joinDate.isValid()) {
              joinDate = dayjs();
            }
          } catch (error) {
            joinDate = dayjs();
          }
          
          // 添加到预览数据
          parsedData.push({
            nickname,
            qqNumber,
            joinDate,
            key: index
          });
        });
        
        setPreviewData(parsedData);
        
        if (errorRows.length > 0) {
          const rowsList = errorRows.length > 3 
            ? `${errorRows.slice(0, 3).join(', ')} 等 ${errorRows.length} 行` 
            : errorRows.join(', ');
          message.warning(`发现 ${errorRows.length} 行数据格式有误，已跳过（行号：${rowsList}）`);
        }
        
        if (excludedRows.length > 0) {
          const rowsList = excludedRows.length > 3 
            ? `${excludedRows.slice(0, 3).join(', ')} 等 ${excludedRows.length} 行` 
            : excludedRows.join(', ');
          message.info(`已自动过滤 ${excludedRows.length} 行不需要导入的QQ号（行号：${rowsList}）`);
        }
        
        if (parsedData.length === 0) {
          message.error('未找到有效数据，请检查文件格式');
        } else {
          message.success(`成功解析 ${parsedData.length} 条数据`);
        }
      } catch (error) {
        console.error('解析Excel文件失败:', error);
        message.error('解析Excel文件失败，请检查文件格式');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // 批量导入成员
  const handleImportMembers = () => {
    if (!previewData || previewData.length === 0) {
      message.error('没有数据可导入');
      return;
    }
    
    // 显示确认对话框
    setConfirmImportVisible(true);
  };
  
  // 执行导入操作 - 改为队列方式导入
  const executeImport = async () => {
    setImporting(true);
    setImportSuccess(0);
    setImportError(0);
    setImportErrorMsg([]);
    setImportProgress(0);
    setImportTotal(previewData.length);
    
    try {
      // 队列处理数据
      let successCount = 0;
      const errorMessages: string[] = [];
      const skippedExcludedQQNumbers: string[] = [];
      
      // 关闭确认对话框，显示进度信息
      setConfirmImportVisible(false);
      
      // 逐个处理数据项
      for (let i = 0; i < previewData.length; i++) {
        const data = previewData[i];
        setImportProgress(i + 1);
        
        try {
          // 最后一道防线，检查是否在排除QQ号列表中
          if (EXCLUDED_QQ_NUMBERS.includes(data.qqNumber)) {
            skippedExcludedQQNumbers.push(data.qqNumber);
            continue; // 跳过这个QQ号，不计入错误
          }
          
          // 添加小延迟，避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // 检查QQ号是否已存在
          const query = new AV.Query('Member');
          query.equalTo('qqNumber', data.qqNumber);
          const count = await query.count();
          
          if (count > 0) {
            throw new Error(`QQ号 ${data.qqNumber} 已存在`);
          }
          
          // 准备成员数据
          const memberData = {
            nickname: data.nickname,
            qqNumber: data.qqNumber,
            gameId: '',
            joinDate: data.joinDate.toDate(),
            stage: MemberStage.NO_TRAINING,
            status: MemberStatus.NORMAL,
            blackpointCount: 0,
            isTeacher: false,
            remark: '批量导入',
            lastTrainingDate: null,
          };
          
          // 调用LeanCloud API保存数据
          await memberService.addMember(memberData);
          successCount++;
          setImportSuccess(successCount);
        } catch (error: any) {
          const errorMsg = error.message || `导入失败: ${data.nickname} (${data.qqNumber})`;
          errorMessages.push(errorMsg);
          setImportError(errorMessages.length);
          setImportErrorMsg([...errorMessages]);
        }
      }
      
      // 如果有排除的QQ号，显示信息
      if (skippedExcludedQQNumbers.length > 0) {
        console.log(`已自动跳过 ${skippedExcludedQQNumbers.length} 个需要排除的QQ号`);
      }
      
      // 显示结果消息
      if (successCount > 0) {
        message.success(`成功导入 ${successCount} 名成员`);
      }
      
      if (errorMessages.length > 0) {
        message.error(`${errorMessages.length} 名成员导入失败`);
      }
      
      // 刷新成员列表
      if (successCount > 0) {
        fetchMembers();
      }
    } catch (error) {
      console.error('批量导入失败:', error);
      message.error('批量导入失败，请检查网络连接或稍后重试');
    } finally {
      setImporting(false);
    }
  };

  // 取消导入确认
  const cancelImportConfirm = () => {
    setConfirmImportVisible(false);
  };

  // 处理移除成员
  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) {
      message.error('未找到该成员');
      return;
    }
    
    setRemovingMember(member);
    setRemoveModalVisible(true);
  };
  
  // 确认移除成员
  const confirmRemoveMember = async () => {
    if (!removingMember) return;
    
    try {
      setLoading(true);
      // 使用LeanCloud API删除对象
      const memberObj = AV.Object.createWithoutData('Member', removingMember.id);
      await memberObj.destroy();
      
      message.success(`${removingMember.nickname} 已从系统中移除`);
      setRemoveModalVisible(false);
      setRemovingMember(null);
      fetchMembers(); // 刷新列表
    } catch (error) {
      console.error('移除成员失败:', error);
      message.error('移除成员失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 取消移除成员
  const cancelRemoveMember = () => {
    setRemoveModalVisible(false);
    setRemovingMember(null);
  };

  // 表格列定义
  const columns = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text: string) => <a>{text}</a>,
      sorter: true
    },
    {
      title: 'QQ号',
      dataIndex: 'qqNumber',
      key: 'qqNumber',
      sorter: true
    },
    {
      title: '游戏ID',
      dataIndex: 'gameId',
      key: 'gameId',
      render: (text: string) => text || '-',
      sorter: true
    },
    {
      title: '加入时间',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date: any) => {
        if (!date) return '-';
        return dayjs(date).format('YYYY-MM-DD');
      },
      sorter: true
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: MemberStage) => (
        <Tag color={getStageTagColor(stage)}>{stage}</Tag>
      ),
      sorter: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: MemberStatus) => (
        <Tag color={getStatusTagColor(status)}>{status}</Tag>
      ),
      sorter: true
    },
    {
      title: '最后新训日期',
      dataIndex: 'lastTrainingDate',
      key: 'lastTrainingDate',
      render: (date: any) => {
        if (!date) return '-';
        return dayjs(date).format('YYYY-MM-DD');
      },
      sorter: true
    },
    {
      title: '黑点数',
      dataIndex: 'blackpointCount',
      key: 'blackpointCount',
      render: (count: number) => {
        const color = count === 0 ? 'green' : count < 3 ? 'orange' : 'red';
        return <Tag color={color}>{count}</Tag>;
      },
      sorter: true
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Member) => (
        <Dropdown menu={{ 
          items: [
            {
              key: 'edit',
              label: '编辑信息',
              icon: <EditOutlined />,
              onClick: () => showEditModal(record),
            },
            {
              key: 'detail',
              label: '查看详情',
              icon: <SearchOutlined />,
              onClick: () => handleViewDetail(record.id),
            },
            {
              key: 'chooseTrainingDate',
              label: '选择新训日期',
              icon: <CalendarOutlined />,
              onClick: () => showTrainingDateModal(record),
            },
            {
              key: 'updateTrainingToday',
              label: '设为今日新训',
              icon: <CalendarOutlined />,
              onClick: () => handleUpdateTrainingDate(record.id),
            },
            {
              key: 'addBlackpoint',
              label: '添加黑点',
              icon: <ExceptionOutlined />,
              onClick: () => handleAddBlackpoint(record.id),
            },
            {
              key: 'registerLeave',
              label: '登记请假',
              icon: <ClockCircleOutlined />,
              onClick: () => handleRegisterLeave(record.id),
            },
            {
              key: 'quit',
              label: '退队处理',
              icon: <LogoutOutlined />,
              onClick: () => handleQuit(record.id),
              danger: true,
            },
            // 只对已退队的成员显示移除选项
            ...(record.status === MemberStatus.QUIT ? [{
              key: 'remove',
              label: '移除成员',
              icon: <DeleteOutlined />,
              onClick: () => handleRemoveMember(record.id),
              danger: true,
            }] : []),
          ]
        }}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };

  // 预览数据表格也添加分页状态
  const [previewPagination, setPreviewPagination] = useState({
    current: 1,
    pageSize: 5,
  });

  // 处理表格变化（排序、筛选等）
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    console.log('表格变化:', { pagination, filters, sorter });
    
    // 处理排序
    if (sorter && sorter.field) {
      setSortInfo({
        field: sorter.field,
        order: sorter.order || null
      });
    } else {
      setSortInfo({
        field: null,
        order: null
      });
    }
  };

  // 导出Excel功能
  const handleExportExcel = () => {
    try {
      const filteredData = getFilteredMembers();
      if (filteredData.length === 0) {
        message.warning('当前没有可导出的数据');
        return;
      }

      // 准备要导出的数据
      const exportData = filteredData.map(member => {
        const memberWithStay = member as MemberWithStay;
        return {
          '昵称': member.nickname,
          'QQ号': member.qqNumber,
          '游戏ID': member.gameId || '-',
          '加入时间': member.joinDate ? dayjs(member.joinDate).format('YYYY-MM-DD') : '-',
          '阶段': member.stage,
          '状态': member.status,
          '最后新训日期': member.lastTrainingDate ? dayjs(member.lastTrainingDate).format('YYYY-MM-DD') : '-',
          '黑点数': member.blackpointCount || 0,
          '是否教师': member.isTeacher ? '是' : '否',
          '留队信息': memberWithStay.hasValidStay ? `有效期至 ${dayjs(memberWithStay.stayValidUntil).format('YYYY-MM-DD')}` : '-',
          '备注': member.remark || ''
        };
      });

      // 创建工作簿和工作表
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const columnWidths = [
        { wch: 15 }, // 昵称
        { wch: 15 }, // QQ号
        { wch: 15 }, // 游戏ID
        { wch: 12 }, // 加入时间
        { wch: 15 }, // 阶段
        { wch: 10 }, // 状态
        { wch: 15 }, // 最后新训日期
        { wch: 8 },  // 黑点数
        { wch: 8 },  // 是否教师
        { wch: 20 }, // 留队信息
        { wch: 30 }  // 备注
      ];
      ws['!cols'] = columnWidths;

      // 将工作表添加到工作簿并导出
      XLSX.utils.book_append_sheet(wb, ws, '成员列表');
      XLSX.writeFile(wb, `成员列表_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      
      message.success('成员列表已导出为Excel文件');
    } catch (error) {
      console.error('导出Excel失败:', error);
      message.error('导出Excel失败，请重试');
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TeamOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
              <Title level={4} style={{ margin: 0 }}>成员列表</Title>
            </div>
            <Space>
              <Tooltip title="刷新数据">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  loading={loading}
                />
              </Tooltip>
              <Tooltip title="导出Excel">
                <Button 
                  icon={<FileExcelOutlined />} 
                  onClick={handleExportExcel}
                />
              </Tooltip>
              <Tooltip title="批量导入">
                <Button 
                  icon={<UploadOutlined />} 
                  onClick={showImportModal}
                >
                  批量导入
                </Button>
              </Tooltip>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/members/add')}
              >
                添加成员
              </Button>
            </Space>
          </div>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="搜索昵称/QQ/游戏ID"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
              <Select 
                placeholder="阶段筛选" 
                style={{ width: 120 }}
                value={stageFilter}
                onChange={value => setStageFilter(value)}
              >
                <Option value="all">全部阶段</Option>
                {Object.values(MemberStage).map(stage => (
                  <Option key={stage} value={stage}>{stage}</Option>
                ))}
              </Select>
              <Select 
                placeholder="状态筛选" 
                style={{ width: 120 }}
                value={statusFilter}
                onChange={value => setStatusFilter(value)}
              >
                <Option value="all">全部状态</Option>
                {Object.values(MemberStatus).map(status => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Space>
          </div>
          
          <StandardTable 
            pageId={PAGE_ID}
            columns={columns} 
            dataSource={getFilteredMembers()} 
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
          />
        </Space>
      </Card>
      
      {/* 编辑成员模态框 */}
      <Modal
        title="编辑成员信息"
        open={editModalVisible}
        onCancel={handleEditCancel}
        footer={[
          <Button key="back" onClick={handleEditCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleEditSave}
          >
            保存
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[
              { required: true, message: '请输入昵称' },
              { max: 120, message: '昵称最长不超过120个字符' }
            ]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item
            name="qqNumber"
            label="QQ号"
            rules={[
              { required: true, message: '请输入QQ号' },
              { pattern: /^\d{5,11}$/, message: 'QQ号格式不正确，应为5-11位数字' }
            ]}
          >
            <Input placeholder="请输入QQ号" />
          </Form.Item>

          <Form.Item
            name="gameId"
            label="游戏ID"
          >
            <Input placeholder="请输入游戏ID（选填）" />
          </Form.Item>

          <Form.Item
            name="joinDate"
            label="加入时间"
            rules={[{ required: true, message: '请选择加入时间' }]}
          >
            <DatePicker 
              locale={locale}
              style={{ width: '100%' }} 
              placeholder="请选择加入时间"
            />
          </Form.Item>

          <Form.Item
            name="lastTrainingDate"
            label="最后新训日期"
          >
            <DatePicker 
              locale={locale}
              style={{ width: '100%' }} 
              placeholder="请选择最后新训日期（选填）"
              onChange={handleLastTrainingDateChange}
            />
          </Form.Item>

          <Form.Item
            name="stage"
            label="阶段"
            rules={[{ required: true, message: '请选择阶段' }]}
          >
            <Select 
              placeholder="请选择阶段" 
              onChange={handleStageChange}
            >
              {Object.values(MemberStage).map(stage => (
                <Option key={stage} value={stage}>{stage}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              {Object.values(MemberStatus).map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="blackpointCount"
            label="黑点数"
            rules={[{ required: true, message: '请输入黑点数' }]}
          >
            <Input type="number" min={0} />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea 
              placeholder="请输入备注信息（选填）"
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新训日期选择模态框 */}
      <Modal
        title="选择新训日期"
        open={trainingDateModalVisible}
        onCancel={handleTrainingDateCancel}
        footer={[
          <Button key="back" onClick={handleTrainingDateCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleTrainingDateSubmit}
          >
            确认更新
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p>为成员 <strong>{currentMemberName}</strong> 选择新训日期</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <DatePicker 
            locale={locale}
            value={selectedTrainingDate}
            onChange={date => date && setSelectedTrainingDate(date)}
            style={{ width: '100%' }}
            allowClear={false}
            disabledDate={date => date && date.isAfter(dayjs())}
          />
        </div>
        <div style={{ marginTop: 16, color: '#888', fontSize: '12px', textAlign: 'center' }}>
          <p>提示：只能选择今天或过去的日期作为新训日期</p>
        </div>
      </Modal>

      {/* 确认设置今日新训模态框 */}
      <Modal
        title="确认设置今日新训"
        open={updateTrainingConfirmVisible}
        onCancel={cancelUpdateTraining}
        footer={[
          <Button key="back" onClick={cancelUpdateTraining}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={confirmUpdateTraining}
          >
            确认
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p>确定将 <strong>{updatingMemberNickname}</strong> 的新训日期设置为今天吗？</p>
        </div>
      </Modal>

      {/* 批量导入模态框 */}
      <Modal
        title="批量导入成员"
        open={importModalVisible}
        onCancel={handleImportCancel}
        width={800}
        footer={[
          <Button key="back" onClick={handleImportCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleImportMembers}
            loading={importing}
            disabled={previewData.length === 0}
          >
            开始导入
          </Button>,
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="文件格式说明"
            description={
              <div>
                <p>1. 支持CSV或Excel文件格式</p>
                <p>2. 文件第一行为标题行（将被忽略）</p>
                <p>3. 数据从第二行开始，每行格式为：群昵称,QQ号,入群日期</p>
                <p>4. 日期格式建议使用 YYYY-MM-DD 格式</p>
                <p>5. 示例：小明,123456789,2023-01-01</p>
                <p>6. 以下QQ号将被自动过滤：{EXCLUDED_QQ_NUMBERS.join('，')}</p>
              </div>
            }
            type="info"
            showIcon
          />
          
          {/* 添加一个常规文件上传按钮作为备选方案 */}
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <Upload
              accept=".csv,.xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => {
                // 检查文件大小（限制为5MB）
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('文件大小不能超过5MB');
                  return Upload.LIST_IGNORE;
                }
                
                // 根据文件类型选择解析方法
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.csv')) {
                  parseCSV(file);
                } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                  parseExcel(file);
                } else {
                  message.error('不支持的文件格式，请上传CSV或Excel文件');
                  return Upload.LIST_IGNORE;
                }
                
                setImportFile(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              如果拖放上传区域无法正常工作，请使用此按钮选择文件
            </div>
          </div>
          
          <Dragger
            name="file"
            accept=".csv,.xlsx,.xls"
            multiple={false}
            showUploadList={false}
            beforeUpload={(file) => {
              // 检查文件大小（限制为5MB）
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                message.error('文件大小不能超过5MB');
                return Upload.LIST_IGNORE;
              }
              
              // 直接在这里处理文件，不等待onChange
              const fileName = file.name.toLowerCase();
              if (fileName.endsWith('.csv')) {
                parseCSV(file);
              } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                parseExcel(file);
              } else {
                message.error('不支持的文件格式，请上传CSV或Excel文件');
                return Upload.LIST_IGNORE;
              }
              
              setImportFile(file);
              return false; // 返回false阻止自动上传
            }}
            onChange={(info) => {
              console.log('Dragger onChange 被触发', info);
              if (info.file.status !== 'uploading') {
                if (!info.file.originFileObj) {
                  console.error('未能获取到文件对象');
                  message.error('文件处理失败，请尝试使用上方的"选择文件"按钮');
                  return;
                }
                
                // 这部分逻辑现在已移到beforeUpload中
              }
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持CSV或Excel文件格式，文件大小不超过5MB</p>
          </Dragger>
          
          {importFile && (
            <div>
              <Text strong>已选择文件：{importFile.name}</Text>
            </div>
          )}
          
          {previewData.length > 0 && (
            <div>
              <Divider orientation="left">数据预览（共 {previewData.length} 条）</Divider>
              <Table
                dataSource={previewData}
                columns={[
                  {
                    title: '群昵称',
                    dataIndex: 'nickname',
                    key: 'nickname',
                  },
                  {
                    title: 'QQ号',
                    dataIndex: 'qqNumber',
                    key: 'qqNumber',
                  },
                  {
                    title: '入群日期',
                    key: 'joinDate',
                    render: (text, record) => record.joinDate.format('YYYY-MM-DD'),
                  },
                ]}
                pagination={{ 
                  current: previewPagination.current,
                  pageSize: previewPagination.pageSize,
                  total: previewData.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onChange: (page, pageSize) => {
                    setPreviewPagination(prev => ({
                      ...prev,
                      current: page,
                      pageSize: pageSize || prev.pageSize
                    }));
                  },
                  onShowSizeChange: (current, size) => {
                    setPreviewPagination(prev => ({
                      ...prev,
                      current: 1,
                      pageSize: size
                    }));
                  },
                  style: { marginRight: '20px' }
                }}
                size="small"
              />
            </div>
          )}
          
          {(importSuccess > 0 || importError > 0 || importing) && (
            <div>
              <Divider orientation="left">导入结果</Divider>
              
              {importing && importTotal > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text>正在导入: {importProgress} / {importTotal}</Text>
                  </div>
                  <div style={{ width: '100%', backgroundColor: '#f0f0f0', borderRadius: 4 }}>
                    <div 
                      style={{ 
                        width: `${(importProgress / importTotal) * 100}%`, 
                        backgroundColor: '#1890ff',
                        height: 8,
                        borderRadius: 4,
                        transition: 'width 0.3s'
                      }} 
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                    <Text>正在分批导入数据，请勿关闭页面...</Text>
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <Tag color="success">成功导入: {importSuccess} 条</Tag>
                <Tag color="error">导入失败: {importError} 条</Tag>
              </div>
              
              {importErrorMsg.length > 0 && (
                <div style={{ maxHeight: 150, overflow: 'auto', marginBottom: 16 }}>
                  <Text type="danger">错误详情:</Text>
                  <ul>
                    {importErrorMsg.map((msg, index) => (
                      <li key={index}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Space>
      </Modal>

      {/* 添加导入确认对话框 */}
      <Modal
        title="确认批量导入"
        open={confirmImportVisible}
        onCancel={cancelImportConfirm}
        footer={[
          <Button key="back" onClick={cancelImportConfirm}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={executeImport}
            loading={importing}
          >
            确认导入
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p>确定要导入 <strong>{previewData.length}</strong> 条成员数据吗？</p>
          <p style={{ fontSize: '12px', color: '#888' }}>导入后将无法撤销，请确认数据无误</p>
        </div>
      </Modal>

      {/* 添加黑点模态框 */}
      <Modal
        title="添加黑点"
        open={blackpointModalVisible}
        onCancel={handleBlackpointCancel}
        footer={[
          <Button key="back" onClick={handleBlackpointCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={loading} 
            onClick={handleBlackpointSubmit}
          >
            确认添加
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>确定为 <strong>{blackpointMember?.nickname}</strong> 添加一个黑点吗？</p>
          <p style={{ fontSize: 12, color: '#888' }}>当前黑点数: {blackpointMember?.blackpointCount || 0}</p>
          
          {blackpointMember && blackpointMember.blackpointCount >= 3 && (
            <Alert 
              message="警告" 
              description={`该成员黑点即将达到4个，达到后将进入退队处理名单`} 
              type="warning" 
              showIcon 
              style={{ marginBottom: 16, marginTop: 8 }}
            />
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>黑点原因:</Text><Text type="danger"> (必填)</Text>
            </div>
            <TextArea
              placeholder="请输入添加黑点的原因（必填）"
              rows={4}
              value={blackpointReason}
              onChange={e => setBlackpointReason(e.target.value)}
            />
          </div>
          
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>登记人:</Text><Text type="danger"> (必填)</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>（记录谁添加的黑点）</Text>
            </div>
            <Input
              placeholder="请输入登记人姓名"
              value={blackpointRegistrar}
              onChange={e => setBlackpointRegistrar(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* 请假登记模态框 */}
      <Modal
        title="登记请假"
        open={leaveModalVisible}
        onCancel={handleLeaveCancel}
        footer={[
          <Button key="back" onClick={handleLeaveCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleLeaveSubmit}
          >
            确认登记
          </Button>,
        ]}
        width={500}
      >
        <Form
          form={leaveForm}
          layout="vertical"
        >
          <div style={{ marginBottom: 16 }}>
            <p>为 <strong>{leaveMember?.nickname}</strong> 登记请假信息</p>
          </div>

          <Form.Item
            name="startDate"
            label="请假开始日期"
            rules={[{ required: true, message: '请选择请假开始日期' }]}
          >
            <DatePicker 
              locale={locale}
              style={{ width: '100%' }} 
              placeholder="请选择开始日期"
            />
          </Form.Item>

          <Form.Item
            name="endDate"
            label="请假结束日期"
            rules={[
              { required: true, message: '请选择请假结束日期' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || !getFieldValue('startDate') || value.isAfter(getFieldValue('startDate'))) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('结束日期必须晚于开始日期'));
                },
              }),
            ]}
          >
            <DatePicker 
              locale={locale}
              style={{ width: '100%' }} 
              placeholder="请选择结束日期"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="请假原因"
            rules={[{ required: true, message: '请输入请假原因' }]}
          >
            <TextArea 
              placeholder="请输入请假原因"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 退队处理模态框 */}
      <Modal
        title="退队处理"
        open={quitModalVisible}
        onCancel={handleQuitCancel}
        footer={[
          <Button key="back" onClick={handleQuitCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={loading} 
            onClick={handleQuitSubmit}
          >
            提交退队申请
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <p>确定要为 <strong>{quitMember?.nickname}</strong> 创建退队申请吗？</p>
          
          <Alert 
            message="提示" 
            description="创建退队申请后，需要在退队审批页面进行审批。审批通过后，该成员将被从系统中移除。此操作不可撤销。" 
            type="info" 
            showIcon 
            style={{ marginBottom: 16, marginTop: 8 }}
          />

          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>退队原因:</Text>
            </div>
            <TextArea
              placeholder="请输入退队原因（必填）"
              rows={4}
              value={quitReason}
              onChange={e => setQuitReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* 成员详情模态框 */}
      <Modal
        title="成员详细信息"
        open={detailModalVisible}
        onCancel={handleDetailCancel}
        footer={[
          <Button key="back" onClick={handleDetailCancel}>
            关闭
          </Button>,
          <Button 
            key="edit" 
            type="primary" 
            onClick={() => {
              handleDetailCancel();
              detailMember && showEditModal(detailMember);
            }}
          >
            编辑信息
          </Button>,
        ]}
        width={700}
      >
        {detailMember && (
          <div style={{ padding: '8px 0' }}>
            <Divider orientation="left">基本信息</Divider>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">昵称：</Text>
                <Text strong>{detailMember.nickname}</Text>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">QQ号：</Text>
                <Text strong>{detailMember.qqNumber}</Text>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">游戏ID：</Text>
                <Text strong>{detailMember.gameId || '-'}</Text>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">加入时间：</Text>
                <Text strong>{detailMember.joinDate ? dayjs(detailMember.joinDate).format('YYYY-MM-DD') : '-'}</Text>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">阶段：</Text>
                <Tag color={getStageTagColor(detailMember.stage)}>{detailMember.stage}</Tag>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">状态：</Text>
                <Tag color={getStatusTagColor(detailMember.status)}>{detailMember.status}</Tag>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">最后新训日期：</Text>
                <Text strong>{detailMember.lastTrainingDate ? dayjs(detailMember.lastTrainingDate).format('YYYY-MM-DD') : '-'}</Text>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">黑点数量：</Text>
                <Tag color={detailMember.blackpointCount === 0 ? 'green' : detailMember.blackpointCount < 3 ? 'orange' : 'red'}>
                  {detailMember.blackpointCount}
                </Tag>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">是否留队：</Text>
                <Tag color={detailMember.hasValidStay ? 'green' : 'default'} 
                  icon={detailMember.hasValidStay ? <PushpinOutlined /> : null}>
                  {detailMember.hasValidStay 
                    ? `是 ${detailMember.stayValidUntil ? `(至 ${dayjs(detailMember.stayValidUntil).format('YYYY-MM-DD')})` : ''}` 
                    : '否'}
                </Tag>
              </div>
              <div style={{ width: '50%', marginBottom: 16 }}>
                <Text type="secondary">创建时间：</Text>
                <Text strong>{detailMember.createdAt ? dayjs(detailMember.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Text>
              </div>
            </div>
            
            <Divider orientation="left">备注信息</Divider>
            <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f9f9f9', borderRadius: 4, minHeight: '80px' }}>
              {detailMember.remark ? (
                <div style={{ whiteSpace: 'pre-line' }}>{detailMember.remark}</div>
              ) : (
                <Text type="secondary">暂无备注信息</Text>
              )}
            </div>
            
            {/* 黑点记录 */}
            <Divider orientation="left">黑点记录</Divider>
            <div style={{ marginBottom: 16 }}>
              {memberBlackpointRecords.length > 0 ? (
                <Table 
                  dataSource={memberBlackpointRecords}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'date',
                      key: 'date',
                      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
                    },
                    {
                      title: '原因',
                      dataIndex: 'reason',
                      key: 'reason',
                    },
                    {
                      title: '状态',
                      dataIndex: 'isActive',
                      key: 'isActive',
                      render: (isActive) => (
                        <Tag color={isActive ? 'red' : 'default'}>
                          {isActive ? '有效' : '已撤销'}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                  rowKey="id"
                />
              ) : (
                <Empty description="暂无黑点记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
            
            {/* 请假记录 */}
            <Divider orientation="left">请假记录</Divider>
            <div style={{ marginBottom: 16 }}>
              {memberLeaveRecords.length > 0 ? (
                <Table 
                  dataSource={memberLeaveRecords}
                  columns={[
                    {
                      title: '开始日期',
                      dataIndex: 'startDate',
                      key: 'startDate',
                      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
                    },
                    {
                      title: '结束日期',
                      dataIndex: 'endDate',
                      key: 'endDate',
                      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
                    },
                    {
                      title: '请假原因',
                      dataIndex: 'reason',
                      key: 'reason',
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status) => {
                        let color = 'default';
                        let text = status || '未知';
                        
                        if (status === 'active') {
                          color = 'orange';
                          text = '请假中';
                        } else if (status === 'expired') {
                          color = 'default';
                          text = '已结束';
                        } else if (status === 'canceled') {
                          color = 'red';
                          text = '已取消';
                        }
                        
                        return <Tag color={color}>{text}</Tag>;
                      }
                    }
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                  rowKey="id"
                />
              ) : (
                <Empty description="暂无请假记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
            
            <Divider orientation="left">快捷操作</Divider>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Button onClick={() => handleUpdateTrainingDate(detailMember.id)} icon={<CalendarOutlined />}>
                设为今日新训
              </Button>
              <Button onClick={() => showTrainingDateModal(detailMember)} icon={<CalendarOutlined />}>
                选择新训日期
              </Button>
              <Button onClick={() => handleAddBlackpoint(detailMember.id)} icon={<ExceptionOutlined />}>
                添加黑点
              </Button>
              <Button onClick={() => handleRegisterLeave(detailMember.id)} icon={<ClockCircleOutlined />}>
                登记请假
              </Button>
              <Button danger onClick={() => handleQuit(detailMember.id)} icon={<LogoutOutlined />}>
                退队处理
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 添加确认移除成员的模态框 */}
      <Modal
        title="确认移除成员"
        open={removeModalVisible}
        onCancel={cancelRemoveMember}
        footer={[
          <Button key="back" onClick={cancelRemoveMember}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={loading} 
            onClick={confirmRemoveMember}
          >
            确认移除
          </Button>,
        ]}
      >
        <div>
          <p>确定要从系统中移除 <strong>{removingMember?.nickname}</strong> 吗？</p>
          <Alert 
            message="警告" 
            description="此操作将从数据库中永久删除该成员记录，无法恢复。建议仅对已退队成员执行此操作。" 
            type="error" 
            showIcon 
            style={{ marginTop: 16 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default MemberList; 