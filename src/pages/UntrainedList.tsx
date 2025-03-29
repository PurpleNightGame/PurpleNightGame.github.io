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
  WarningOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LogoutOutlined,
  EditOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import { Member, MemberStage, MemberStatus } from '../types/member';
import dayjs from 'dayjs';
import { memberService, quitService, stayService } from '../utils/leancloud';

// 导入AV
import AV from 'leancloud-storage';

const { Title, Text } = Typography;

// 扩展Member接口增加留队信息
interface MemberWithStay extends Member {
  hasValidStay: boolean;
  stayValidUntil?: Date;
}

const UntrainedList: React.FC = () => {
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

  // 获取未训练的成员
  const fetchUntrainedMembers = async () => {
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
        countdownOverride: item.get('countdownOverride') || null,
        hasValidStay: false, // 默认为false，后续检查
        stayValidUntil: undefined
      }));
      
      // 筛选未训练的成员（阶段为NO_TRAINING且状态为NORMAL）
      const untrainedMembers = allMembers.filter(member => 
        member.stage === MemberStage.NO_TRAINING && 
        member.status === MemberStatus.NORMAL
      ) as MemberWithStay[];
      
      // 如果有未训成员，检查他们是否有有效的留队申请
      if (untrainedMembers.length > 0) {
        try {
          // 获取所有有效的留队申请
          const query = new AV.Query('StayRecord');
          query.equalTo('isApproved', true);
          query.greaterThan('validUntil', new Date());
          const validStayRecords = await query.find();
          
          // 创建一个映射以加快查找
          const stayMap = new Map();
          validStayRecords.forEach((record: any) => {
            const memberId = record.get('memberId');
            const validUntil = record.get('validUntil');
            stayMap.set(memberId, validUntil);
          });
          
          // 更新成员的留队状态
          untrainedMembers.forEach(member => {
            if (stayMap.has(member.id)) {
              member.hasValidStay = true;
              member.stayValidUntil = stayMap.get(member.id);
            }
          });
        } catch (error) {
          console.error('获取留队申请失败:', error);
          // 如果查询失败，继续处理，不影响页面显示
        }
      }
      
      setMembers(untrainedMembers);
    } catch (error) {
      console.error('获取未训练成员失败:', error);
      message.error('获取未训练成员失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUntrainedMembers();
  }, []);

  // 计算倒计时天数
  const calculateCountdown = (joinDate: Date, countdownOverride: number | null = null) => {
    const joinDay = dayjs(joinDate);
    const today = dayjs();
    const daysPassed = today.diff(joinDay, 'day');
    
    // 默认倒计时天数
    const defaultCountdown = 3;
    
    // 使用自定义倒计时或默认值
    const totalCountdown = countdownOverride !== null ? countdownOverride : defaultCountdown;
    const daysLeft = Math.max(0, totalCountdown - daysPassed);
    
    return {
      daysPassed,
      daysLeft,
      totalCountdown,
      isExpired: daysLeft <= 0,
      progressPercent: Math.min(100, (daysPassed / totalCountdown) * 100)
    };
  };

  // 更新训练日期并修改阶段
  const handleUpdateTrainingDate = (memberId: string) => {
    Modal.confirm({
      title: '更新新训日期',
      content: '确定将当前日期设置为该成员的最后一次新训日期，并将阶段更新为"新训初期"吗？',
      onOk: async () => {
        try {
          // 使用原生 JavaScript Date 对象
          const currentDate = new Date();
          
          await memberService.updateMember(memberId, {
            lastTrainingDate: currentDate,
            stage: MemberStage.NEW_TRAINING_INITIAL,
          });
          
          message.success('成员已更新为新训初期');
          
          // 重新获取未训练成员列表
          fetchUntrainedMembers();
        } catch (error) {
          console.error('更新成员阶段失败:', error);
          message.error('操作失败，请重试');
        }
      },
    });
  };

  // 退队处理
  const handleQuit = (memberId: string, memberName: string, memberQQ: string, hasValidStay: boolean) => {
    // 如果成员有有效留队申请，提示并返回
    if (hasValidStay) {
      message.warning(`成员 ${memberName} 有有效的留队申请，不能通过未新训原因退队`);
      return;
    }

    Modal.confirm({
      title: '退队处理',
      content: '确定将该成员移至退队审批吗？',
      onOk: async () => {
        try {
          // 创建退队记录
          await quitService.createQuitRequest({
            memberId: memberId,
            memberName: memberName,
            memberQQ: memberQQ,
            reason: '未按时参加新训',
            date: new Date(),
            isAutomatic: false,
            isPending: true,
            source: 'untrained',
            isApproved: false,
            adminRemark: ''
          });
          
          // 更新成员状态为退队
          await memberService.updateMember(memberId, {
            status: MemberStatus.QUIT
          });
          
          message.success('成员已移至退队审批');
          
          // 重新获取未训练成员列表
          fetchUntrainedMembers();
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
    const { totalCountdown } = calculateCountdown(member.joinDate, member.countdownOverride);
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
        countdownOverride: values.countdown
      });
      
      message.success(`已将 ${currentMemberName} 的退队倒计时修改为 ${values.countdown} 天`);
      setCountdownModalVisible(false);
      
      // 重新获取成员列表以更新显示
      fetchUntrainedMembers();
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
      } else if (field === 'joinDate') {
        // 日期排序
        const aDate = a.joinDate ? new Date(a.joinDate).getTime() : 0;
        const bDate = b.joinDate ? new Date(b.joinDate).getTime() : 0;
        comparison = aDate - bDate;
      } else if (field === 'countdown') {
        // 倒计时排序（根据剩余天数）
        const aStatus = calculateCountdown(a.joinDate, a.countdownOverride);
        const bStatus = calculateCountdown(b.joinDate, b.countdownOverride);
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

  // 批量更新为新训初期
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
        // 批量更新为新训初期
        const currentDate = new Date();
        
        for (const key of selectedRowKeys) {
          await memberService.updateMember(key.toString(), {
            lastTrainingDate: currentDate,
            stage: MemberStage.NEW_TRAINING_INITIAL,
          });
        }
        
        message.success(`已将 ${selectedRowKeys.length} 名成员更新为新训初期`);
      } else if (selectionModalType === 'quit') {
        // 批量退队处理
        const selectedMembers = members.filter(m => selectedRowKeys.includes(m.id));
        let skippedCount = 0;
        
        for (const member of selectedMembers) {
          // 如果成员有有效留队申请，跳过
          if (member.hasValidStay) {
            skippedCount++;
            continue;
          }
          
          // 创建退队记录
          await quitService.createQuitRequest({
            memberId: member.id,
            memberName: member.nickname,
            memberQQ: member.qqNumber,
            reason: '未按时参加新训',
            date: new Date(),
            isAutomatic: false,
            isPending: true,
            source: 'untrained',
            isApproved: false,
            adminRemark: '批量操作'
          });
          
          // 更新成员状态为退队
          await memberService.updateMember(member.id, {
            status: MemberStatus.QUIT
          });
        }
        
        if (skippedCount > 0) {
          message.warning(`已跳过 ${skippedCount} 名有留队申请的成员`);
        }
        
        message.success(`已将 ${selectedRowKeys.length - skippedCount} 名成员移至退队审批`);
      }
      
      // 重置选择状态
      setSelectedRowKeys([]);
      setSelectionModalVisible(false);
      
      // 重新获取数据
      fetchUntrainedMembers();
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
      title: '加入时间',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: true,
    },
    {
      title: '状态',
      key: 'countdown',
      render: (_: any, record: MemberWithStay) => {
        const { daysLeft, isExpired, progressPercent, totalCountdown } = calculateCountdown(
          record.joinDate, 
          record.countdownOverride
        );
        
        // 显示自定义倒计时标识
        const isCustomCountdown = record.countdownOverride !== null;
        const countdownText = isCustomCountdown ? 
          `剩余 ${daysLeft} 天(已调整)` : 
          `剩余 ${daysLeft} 天`;
        
        // 展示留队状态
        if (record.hasValidStay) {
          const validUntilText = record.stayValidUntil 
            ? `至 ${dayjs(record.stayValidUntil).format('YYYY-MM-DD')}`
            : '';
          
          return (
            <Space>
              <Tag color="green" icon={<PushpinOutlined />}>
                已留队 {validUntilText}
              </Tag>
            </Space>
          );
        }
        
        if (isExpired) {
          return (
            <Space>
              <Tag color="red">
                <WarningOutlined /> 已超时
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
        const { isExpired } = calculateCountdown(record.joinDate, record.countdownOverride);
        
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
            
            <Tooltip title="更新为新训初期">
              <Button 
                type="primary" 
                size="small" 
                icon={<CalendarOutlined />}
                onClick={() => handleUpdateTrainingDate(record.id)}
              >
                已新训
              </Button>
            </Tooltip>
            
            <Tooltip title={record.hasValidStay ? '已有留队申请，无法退队' : (isExpired ? '移至退队审批' : '提前退队')}>
              <Button 
                danger
                size="small" 
                icon={<LogoutOutlined />}
                disabled={record.hasValidStay}
                onClick={() => handleQuit(record.id, record.nickname, record.qqNumber, record.hasValidStay)}
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
            <WarningOutlined style={{ fontSize: 24, marginRight: 8, color: '#fa8c16' }} />
            <Title level={4} style={{ margin: 0 }}>未训名单</Title>
          </div>
          
          <Divider />
          
          <div style={{ backgroundColor: '#fff7e6', padding: 16, borderRadius: 8, border: '1px solid #ffe7ba' }}>
            <Space direction="vertical" size="small">
              <Text strong>未训名单说明</Text>
              <Text type="secondary">
                1. 新加入成员将出现在未训名单中，开始倒计时3天。
                <br />
                2. 倒计时结束后，若成员仍未参加新训，将自动加入退队审批名单。
                <br />
                3. 成员参加新训后，请点击"已新训"按钮，系统将自动将成员阶段更新为"新训初期"。
                <br />
                4. 如需延长倒计时，可点击"调整倒计时"按钮修改退队倒计时天数。
                <br />
                5. <Text strong style={{ color: 'green' }}>有留队申请的成员会显示绿色标签</Text>，这些成员不会因为未训练而被强制退队。
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
                批量更新为新训初期 ({selectedRowKeys.length})
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
            locale={{ emptyText: '当前没有未训成员' }}
            rowClassName={(record: MemberWithStay) => record.hasValidStay ? 'stay-approved-row' : ''}
            onChange={handleTableChange}
          />
        </Space>
      </Card>

      {/* 修改倒计时模态框 */}
      <Modal
        title="修改退队倒计时"
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
            label={`为 ${currentMemberName} 设置新的退队倒计时天数`}
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
            默认倒计时为3天，您可以根据实际情况调整倒计时天数。调整后，系统将基于成员加入日期和新的倒计时天数重新计算。
          </Text>
        </Form>
      </Modal>
      
      {/* 批量操作确认模态框 */}
      <Modal
        title={selectionModalType === 'update' ? '批量更新为新训初期' : '批量移至退队审批'}
        open={selectionModalVisible}
        onCancel={cancelBatchAction}
        onOk={confirmBatchAction}
        confirmLoading={loading}
      >
        <p>
          {selectionModalType === 'update' 
            ? `确定要将选中的 ${selectedRowKeys.length} 名成员更新为新训初期吗？` 
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

export default UntrainedList;

 