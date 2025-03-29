import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Typography,
  Divider,
  Tag,
  Progress,
  Modal,
  message,
  Tooltip,
  InputNumber,
  Form
} from 'antd';
import { 
  BellOutlined, 
  ClockCircleOutlined,
  CalendarOutlined,
  LogoutOutlined,
  PhoneOutlined,
  EditOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import { Member, MemberStage, MemberStatus } from '../types/member';
import dayjs from 'dayjs';
import { memberService, quitService, stayService } from '../utils/leancloud';
import AV from 'leancloud-storage';

const { Title, Text } = Typography;

// 扩展Member接口添加留队信息
interface MemberWithStay extends Member {
  hasValidStay: boolean;
  stayValidUntil?: Date;
}

const TrainingReminder: React.FC = () => {
  const [members, setMembers] = useState<MemberWithStay[]>([]);
  const [loading, setLoading] = useState(false);
  const [countdownModalVisible, setCountdownModalVisible] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [currentMemberName, setCurrentMemberName] = useState<string>('');
  const [countdownForm] = Form.useForm();
  // 添加排序状态
  const [sortInfo, setSortInfo] = useState<{
    field: string | null;
    order: 'ascend' | 'descend' | null;
  }>({
    field: null,
    order: null
  });
  // 添加选中行状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionModalType, setSelectionModalType] = useState<'update' | 'quit'>('update');

  // 获取需要训练提醒的成员
  const fetchMembersForReminder = async () => {
    try {
      setLoading(true);
      
      // 获取所有成员
      const result = await memberService.getAllMembers();
      
      // 格式化成员数据
      const allMembers = result.map((item: any) => ({
        key: item.id,
        id: item.id,
        nickname: item.get('nickname') || '',
        qqNumber: item.get('qqNumber') || '',
        gameId: item.get('gameId') || '',
        joinDate: item.get('joinDate') || new Date(),
        stage: item.get('stage') || MemberStage.NO_TRAINING,
        status: item.get('status') || MemberStatus.NORMAL,
        lastTrainingDate: item.get('lastTrainingDate'),
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false,
        reminderCountdownOverride: item.get('reminderCountdownOverride') || null,
        hasValidStay: false, // 默认没有有效的留队申请
        stayValidUntil: undefined
      }));
      
      // 查询所有有效的留队申请
      try {
        const query = new AV.Query('StayRecord');
        query.equalTo('isApproved', true);
        query.greaterThan('validUntil', new Date());
        const validStayRecords = await query.find();
        
        // 创建映射以加快查找
        const stayMap = new Map();
        validStayRecords.forEach((record: any) => {
          const memberId = record.get('memberId');
          const validUntil = record.get('validUntil');
          stayMap.set(memberId, validUntil);
        });
        
        // 更新成员的留队状态
        allMembers.forEach(member => {
          if (stayMap.has(member.id)) {
            member.hasValidStay = true;
            member.stayValidUntil = stayMap.get(member.id);
          }
        });
      } catch (error) {
        console.error('获取留队申请失败:', error);
        // 如果查询失败，继续处理，不影响页面显示
      }
      
      // 筛选需要提醒的成员:
      // 1. 非紫夜成员
      // 2. 状态正常
      // 3. 有上次训练日期
      // 4. 上次训练日期超过7天
      // 5. 没有有效的留队申请
      const today = dayjs();
      const remindThreshold = 7; // 7天提醒阈值
      
      const membersToRemind = allMembers.filter(member => {
        if (member.stage === MemberStage.PURPLE_NIGHT) return false; // 排除紫夜成员
        if (member.status !== MemberStatus.NORMAL) return false; // 只包含状态正常的成员
        if (!member.lastTrainingDate) return false; // 必须有上次训练日期
        if (member.hasValidStay) return false; // 排除有有效留队申请的成员
        
        const daysSinceLastTraining = today.diff(dayjs(member.lastTrainingDate), 'day');
        return daysSinceLastTraining >= remindThreshold; // 超过7天未训练
      });
      
      setMembers(membersToRemind);
    } catch (error) {
      console.error('获取需要提醒的成员失败:', error);
      message.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersForReminder();
  }, []);

  // 计算新训情况
  const calculateTrainingStatus = (lastTrainingDate: Date | undefined, countdownOverride: number | null = null) => {
    if (!lastTrainingDate) {
      return {
        daysPassed: 0,
        daysLeft: 0,
        isExpired: false,
        inReminderPhase: false,
        progressPercent: 0,
        totalCountdown: 0
      };
    }
    
    const lastTraining = dayjs(lastTrainingDate);
    const today = dayjs();
    const daysPassed = today.diff(lastTraining, 'day');
    const reminderDays = 7; // 7天未新训进入催促名单
    
    // 默认催促倒计时天数
    const defaultCountdown = 3;
    
    // 使用自定义倒计时或默认值
    const totalCountdown = countdownOverride !== null ? countdownOverride : defaultCountdown;
    
    const inReminderPhase = daysPassed >= reminderDays;
    const daysInReminder = daysPassed - reminderDays;
    const daysLeft = Math.max(0, totalCountdown - daysInReminder);
    const isExpired = daysLeft <= 0;
    
    return {
      daysPassed,
      daysLeft,
      totalCountdown,
      isExpired,
      inReminderPhase,
      progressPercent: Math.min(100, (daysInReminder / totalCountdown) * 100)
    };
  };

  // 更新训练日期
  const handleUpdateTrainingDate = (memberId: string) => {
    Modal.confirm({
      title: '更新新训日期',
      content: '确定将当前日期设置为该成员的最后一次新训日期吗？',
      onOk: async () => {
        try {
          // 使用原生 JavaScript Date 对象
          const currentDate = new Date();
          
          await memberService.updateMember(memberId, {
            lastTrainingDate: currentDate,
          });
          
          message.success('新训日期已更新');
          
          // 重新获取需要提醒的成员列表
          fetchMembersForReminder();
        } catch (error) {
          console.error('更新成员新训日期失败:', error);
          message.error('操作失败，请重试');
        }
      },
    });
  };

  // 联系成员
  const handleContact = (member: MemberWithStay) => {
    Modal.info({
      title: '联系成员',
      content: (
        <div>
          <p>请通过以下方式联系成员：</p>
          <p><strong>昵称：</strong>{member.nickname}</p>
          <p><strong>QQ号：</strong>{member.qqNumber}</p>
          {member.gameId && <p><strong>游戏ID：</strong>{member.gameId}</p>}
          <p>提醒该成员尽快参加新训，避免被系统自动退队。</p>
        </div>
      ),
    });
  };

  // 退队处理
  const handleQuit = (memberId: string, memberName: string, memberQQ: string) => {
    Modal.confirm({
      title: '退队处理',
      content: '确定将该成员移至退队审批吗？',
      onOk: async () => {
        try {
          // 先检查是否有有效的留队申请
          const hasValidStayRequest = await stayService.checkValidStayRequest(memberId);
          
          if (hasValidStayRequest) {
            message.warning(`成员 ${memberName} 有有效的留队申请，不能通过未新训原因退队`);
            return;
          }
          
          // 创建退队记录
          await quitService.createQuitRequest({
            memberId: memberId,
            memberName: memberName,
            memberQQ: memberQQ,
            reason: '长期未参加新训',
            date: new Date(),
            isAutomatic: true,
            source: 'reminder',
            isPending: true,
            isApproved: false,
            adminRemark: ''
          });
          
          // 更新成员状态为退队
          await memberService.updateMember(memberId, {
            status: MemberStatus.QUIT
          });
          
          message.success('成员已移至退队审批');
          
          // 重新获取需要提醒的成员列表
          fetchMembersForReminder();
        } catch (error) {
          console.error('退队处理失败:', error);
          message.error('操作失败，请重试');
        }
      },
    });
  };

  // 显示修改倒计时模态框
  const showCountdownModal = (member: MemberWithStay) => {
    setCurrentMemberId(member.id);
    setCurrentMemberName(member.nickname);
    
    // 设置表单初始值
    const { totalCountdown } = calculateTrainingStatus(member.lastTrainingDate, member.reminderCountdownOverride);
    countdownForm.setFieldsValue({ countdown: totalCountdown });
    
    setCountdownModalVisible(true);
  };

  // 处理倒计时修改
  const handleCountdownSubmit = async () => {
    try {
      const values = await countdownForm.validateFields();
      
      if (!currentMemberId) return;
      
      setLoading(true);
      
      // 更新成员的倒计时覆盖值
      await memberService.updateMember(currentMemberId, {
        reminderCountdownOverride: values.countdown
      });
      
      message.success(`已将 ${currentMemberName} 的催促倒计时修改为 ${values.countdown} 天`);
      setCountdownModalVisible(false);
      
      // 重新获取成员列表以更新显示
      fetchMembersForReminder();
    } catch (error) {
      console.error('修改倒计时失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 取消修改倒计时
  const handleCountdownCancel = () => {
    setCountdownModalVisible(false);
    setCurrentMemberId('');
    setCurrentMemberName('');
  };

  // 添加表格变化处理函数（在handleCountdownCancel函数后面添加）
  // 处理表格排序变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
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

  // 获取排序后的成员列表
  const getSortedMembers = () => {
    if (!sortInfo.field || !sortInfo.order) {
      return members;
    }

    const { field, order } = sortInfo;
    return [...members].sort((a, b) => {
      let comparison = 0;

      // 根据不同字段类型处理排序
      if (field === 'nickname' || field === 'qqNumber') {
        // 字符串排序
        const aValue = (a[field as keyof MemberWithStay] || '').toString().toLowerCase();
        const bValue = (b[field as keyof MemberWithStay] || '').toString().toLowerCase();
        comparison = aValue.localeCompare(bValue);
      } else if (field === 'stage') {
        // 阶段排序
        const stageOrder = {
          [MemberStage.NO_TRAINING]: 1,
          [MemberStage.NEW_TRAINING_INITIAL]: 2,
          [MemberStage.NEW_TRAINING_1]: 3,
          [MemberStage.NEW_TRAINING_2]: 4,
          [MemberStage.NEW_TRAINING_3]: 5,
          [MemberStage.NEW_TRAINING_CANDIDATE]: 6,
          [MemberStage.PURPLE_NIGHT]: 7,
        };
        comparison = stageOrder[a.stage] - stageOrder[b.stage];
      } else if (field === 'lastTrainingDate') {
        // 日期排序
        const aDate = a.lastTrainingDate ? new Date(a.lastTrainingDate).getTime() : 0;
        const bDate = b.lastTrainingDate ? new Date(b.lastTrainingDate).getTime() : 0;
        comparison = aDate - bDate;
      } else if (field === 'countdown') {
        // 倒计时排序（根据剩余天数）
        const aStatus = calculateTrainingStatus(a.lastTrainingDate, a.reminderCountdownOverride);
        const bStatus = calculateTrainingStatus(b.lastTrainingDate, b.reminderCountdownOverride);
        comparison = aStatus.daysLeft - bStatus.daysLeft;
      }

      return order === 'ascend' ? comparison : -comparison;
    });
  };

  // 处理行选择变化
  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  // 批量更新新训日期
  const handleBatchUpdateTraining = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择成员');
      return;
    }
    
    setSelectionModalType('update');
    setSelectionModalVisible(true);
  };

  // 批量退队处理
  const handleBatchQuit = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择成员');
      return;
    }
    
    setSelectionModalType('quit');
    setSelectionModalVisible(true);
  };

  // 确认批量操作
  const confirmBatchAction = async () => {
    try {
      setLoading(true);
      
      if (selectionModalType === 'update') {
        // 批量更新新训日期
        const currentDate = new Date();
        
        for (const key of selectedRowKeys) {
          await memberService.updateMember(key.toString(), {
            lastTrainingDate: currentDate,
          });
        }
        
        message.success(`已为 ${selectedRowKeys.length} 名成员更新新训日期`);
      } else if (selectionModalType === 'quit') {
        // 批量退队处理
        const selectedMembers = members.filter(m => selectedRowKeys.includes(m.id));
        
        for (const member of selectedMembers) {
          // 先检查是否有有效的留队申请
          const hasValidStayRequest = await stayService.checkValidStayRequest(member.id);
          
          if (hasValidStayRequest) {
            message.warning(`成员 ${member.nickname} 有有效的留队申请，已跳过`);
            continue;
          }
          
          // 创建退队记录
          await quitService.createQuitRequest({
            memberId: member.id,
            memberName: member.nickname,
            memberQQ: member.qqNumber,
            reason: '长期未参加新训',
            date: new Date(),
            isAutomatic: true,
            source: 'reminder',
            isPending: true,
            isApproved: false,
            adminRemark: '批量操作'
          });
          
          // 更新成员状态为退队
          await memberService.updateMember(member.id, {
            status: MemberStatus.QUIT
          });
        }
        
        message.success(`已将 ${selectedRowKeys.length} 名成员移至退队审批`);
      }
      
      // 重置选择状态
      setSelectedRowKeys([]);
      setSelectionModalVisible(false);
      
      // 重新获取数据
      fetchMembersForReminder();
    } catch (error) {
      console.error('批量操作失败:', error);
      message.error('批量操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 取消批量操作
  const cancelBatchAction = () => {
    setSelectionModalVisible(false);
  };

  // 表格列定义
  const columns = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      sorter: true,
    },
    {
      title: 'QQ号',
      dataIndex: 'qqNumber',
      key: 'qqNumber',
      sorter: true,
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: MemberStage) => {
        let color = 'blue';
        if (stage === MemberStage.NEW_TRAINING_CANDIDATE) color = 'geekblue';
        if (stage === MemberStage.NEW_TRAINING_INITIAL) color = 'lime';
        return <Tag color={color}>{stage}</Tag>;
      },
      sorter: true,
    },
    {
      title: '最后新训日期',
      dataIndex: 'lastTrainingDate',
      key: 'lastTrainingDate',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: true,
    },
    {
      title: '状态',
      key: 'countdown',
      render: (_: any, record: MemberWithStay) => {
        const { daysLeft, isExpired, progressPercent } = calculateTrainingStatus(
          record.lastTrainingDate,
          record.reminderCountdownOverride
        );
        
        // 显示自定义倒计时标识
        const isCustomCountdown = record.reminderCountdownOverride !== null;
        const countdownText = isCustomCountdown ? 
          `剩余 ${daysLeft} 天(已调整)` : 
          `剩余 ${daysLeft} 天`;
        
        if (isExpired) {
          return (
            <Space>
              <Tag color="red">
                <ClockCircleOutlined /> 已超时
              </Tag>
              <Progress 
                percent={100} 
                size="small" 
                status="exception" 
                style={{ width: 80 }} 
                showInfo={false}
              />
            </Space>
          );
        }
        
        return (
          <Space>
            <Tag color={isCustomCountdown ? "purple" : "orange"}>
              <ClockCircleOutlined /> {countdownText}
            </Tag>
            <Progress 
              percent={progressPercent} 
              size="small" 
              status="active" 
              style={{ width: 80 }} 
              showInfo={false}
            />
          </Space>
        );
      },
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MemberWithStay) => {
        const { isExpired } = calculateTrainingStatus(
          record.lastTrainingDate,
          record.reminderCountdownOverride
        );
        
        return (
          <Space>
            <Tooltip title="修改倒计时">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => showCountdownModal(record)}
              >
                调整倒计时
              </Button>
            </Tooltip>
            
            <Tooltip title="更新新训日期">
              <Button 
                type="primary" 
                size="small" 
                icon={<CalendarOutlined />}
                onClick={() => handleUpdateTrainingDate(record.id)}
              >
                已新训
              </Button>
            </Tooltip>
            
            <Tooltip title="联系成员">
              <Button 
                size="small" 
                icon={<PhoneOutlined />}
                onClick={() => handleContact(record)}
              >
                联系
              </Button>
            </Tooltip>
            
            <Tooltip title={isExpired ? '移至退队审批' : '提前退队'}>
              <Button 
                danger
                size="small" 
                icon={<LogoutOutlined />}
                onClick={() => handleQuit(record.id, record.nickname, record.qqNumber)}
              >
                退队
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BellOutlined style={{ fontSize: 24, marginRight: 8, color: '#fa541c' }} />
            <Title level={4} style={{ margin: 0 }}>催促名单</Title>
          </div>
          
          <Divider />
          
          <div style={{ backgroundColor: '#fff2e8', padding: 16, borderRadius: 8, border: '1px solid #ffccc7' }}>
            <Space direction="vertical" size="small">
              <Text strong>催促名单说明</Text>
              <Text type="secondary">
                1. 已有新训记录的非紫夜成员，超过7天未参加新训，将自动进入催促名单。
                <br />
                2. 成员进入催促名单后，有3天倒计时，期间请及时联系成员。
                <br />
                3. 倒计时结束后，若成员仍未参加新训，将自动加入退队审批名单。
                <br />
                4. 成员参加新训后，请点击"已新训"按钮更新最后一次新训日期。
                <br />
                5. 如需延长倒计时，可点击"调整倒计时"按钮修改退队倒计时天数。
                <br />
                6. <Text strong style={{ color: 'green' }}>有留队申请的成员不会出现在催促名单中</Text>，无需担心系统自动退队。
              </Text>
            </Space>
          </div>
          
          {/* 添加批量操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Space>
              <Button 
                type="primary" 
                onClick={handleBatchUpdateTraining}
                disabled={selectedRowKeys.length === 0}
              >
                批量更新新训日期 ({selectedRowKeys.length})
              </Button>
              <Button 
                danger 
                onClick={handleBatchQuit}
                disabled={selectedRowKeys.length === 0}
              >
                批量移至退队审批 ({selectedRowKeys.length})
              </Button>
            </Space>
          </div>
          
          <Table 
            rowSelection={rowSelection}
            columns={columns} 
            dataSource={getSortedMembers()} 
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: '当前没有需要催促的成员' }}
            onChange={handleTableChange}
          />
        </Space>
      </Card>
      
      {/* 修改倒计时模态框 */}
      <Modal
        title="修改催促倒计时"
        open={countdownModalVisible}
        onCancel={handleCountdownCancel}
        onOk={handleCountdownSubmit}
        confirmLoading={loading}
      >
        <Form
          form={countdownForm}
          layout="vertical"
        >
          <Form.Item
            label={`为 ${currentMemberName} 设置新的催促倒计时天数`}
            name="countdown"
            rules={[
              { required: true, message: '请输入倒计时天数' },
              { type: 'number', min: 1, message: '倒计时天数必须大于0' }
            ]}
          >
            <InputNumber 
              min={1} 
              max={30}
              style={{ width: '100%' }} 
              placeholder="请输入倒计时天数" 
              addonAfter="天"
            />
          </Form.Item>
          <Text type="secondary">
            默认催促倒计时为3天，您可以根据实际情况调整倒计时天数。调整后，系统将基于成员最后新训日期和新的倒计时天数重新计算。
          </Text>
        </Form>
      </Modal>
      
      {/* 批量操作确认模态框 */}
      <Modal
        title={selectionModalType === 'update' ? '批量更新新训日期' : '批量移至退队审批'}
        open={selectionModalVisible}
        onCancel={cancelBatchAction}
        onOk={confirmBatchAction}
        confirmLoading={loading}
      >
        <p>
          {selectionModalType === 'update' 
            ? `确定要为选中的 ${selectedRowKeys.length} 名成员更新新训日期吗？` 
            : `确定要将选中的 ${selectedRowKeys.length} 名成员移至退队审批吗？`}
        </p>
        {selectionModalType === 'quit' && (
          <p style={{ color: '#ff4d4f' }}>
            注意：系统会自动跳过有留队申请的成员。
          </p>
        )}
      </Modal>
    </div>
  );
};

export default TrainingReminder;