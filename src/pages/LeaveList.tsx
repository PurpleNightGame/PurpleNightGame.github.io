import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Tooltip, 
  Modal, 
  Typography, 
  Select,
  message,
  Divider,
  Popconfirm,
  Badge,
  DatePicker,
  Form,
  Radio
} from 'antd';
import { 
  SearchOutlined, 
  ClockCircleOutlined, 
  EyeOutlined, 
  ReloadOutlined, 
  FilterOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import AV from 'leancloud-storage';
import { LeaveRecord, Member, MemberStatus } from '../types/member';
import { memberService, leaveService } from '../utils/leancloud';
import dayjs from 'dayjs';
import { useMessage } from '../utils/messageUtil';
import { getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 枚举请假状态
enum LeaveStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

interface LeaveItem {
  key: string;
  id: string;
  memberId: string;
  memberName: string;
  memberQQ: string;
  reason: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'ended' | 'cancelled';
  createdAt: Date;
  duration: number;
}

// 页面唯一标识，用于缓存分页设置
const PAGE_ID = 'leave_list';

const LeaveList: React.FC = () => {
  const [leaveRecords, setLeaveRecords] = useState<LeaveItem[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<LeaveItem | null>(null);
  const [memberDict, setMemberDict] = useState<Record<string, Member>>({});
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [endLeaveModalVisible, setEndLeaveModalVisible] = useState(false);
  const [endingLeaveRecord, setEndingLeaveRecord] = useState<LeaveItem | null>(null);
  const message = useMessage();
  // 使用缓存初始化分页状态
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(PAGE_ID),
    total: 0
  }));

  // 组件挂载时加载数据
  useEffect(() => {
    // 使用一个标记防止重复加载
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 获取所有成员
        const memberResults = await memberService.getAllMembers();
        console.log('获取到的成员数量:', memberResults.length);
        
        if (!isMounted) return;
        
        if (memberResults.length === 0) {
          message.warning('未找到任何成员数据，请先添加成员');
        }
        
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
        
        console.log('格式化后的成员数量:', formattedMembers.length);
        if (!isMounted) return;
        
        setMembers(formattedMembers);
        
        // 创建成员字典用于快速查找
        const memberDictionary: Record<string, Member> = {};
        formattedMembers.forEach(member => {
          memberDictionary[member.id] = member;
        });
        
        setMemberDict(memberDictionary);
        
        // 获取所有请假记录
        const leaveResults = await leaveService.getAllLeaveRecords();
        console.log('获取到的请假记录数量:', leaveResults.length);
        
        if (!isMounted) return;
        
        if (leaveResults.length === 0) {
          message.info('暂无请假记录');
        }
        
        const formattedLeaves = await Promise.all(leaveResults.map(async (item: any) => {
          const memberId = item.get('memberId');
          const member = memberDictionary[memberId];
          const startDate = item.get('startDate');
          const endDate = item.get('endDate');
          const duration = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
          
          // 如果找不到对应成员，记录警告信息
          if (!member) {
            console.warn(`未找到ID为 ${memberId} 的成员信息`);
          }
          
          return {
            key: item.id,
            id: item.id,
            memberId: memberId,
            memberName: member ? member.nickname : '未知成员',
            memberQQ: member ? member.qqNumber : '未知',
            reason: item.get('reason'),
            startDate: startDate,
            endDate: endDate,
            status: item.get('status'),
            createdAt: item.createdAt,
            duration: duration
          };
        }));
        
        console.log('格式化后的请假记录:', formattedLeaves.length);
        if (!isMounted) return;
        
        setLeaveRecords(formattedLeaves);
        setFilteredRecords(formattedLeaves);
      } catch (error) {
        console.error('获取数据失败:', error);
        if (isMounted) {
          message.error('获取数据失败，请检查网络连接');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // 组件卸载时清理
    return () => {
      isMounted = false;
    };
  }, []);
  
  // 删除旧的fetchData函数，将其内容已移至useEffect中
  // 保留一个更新数据的函数，供刷新按钮使用
  const refreshData = () => {
    fetchData();
  };
  
  // 重新定义fetchData函数
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取所有成员
      const memberResults = await memberService.getAllMembers();
      console.log('获取到的成员数量:', memberResults.length);
      
      if (memberResults.length === 0) {
        message.warning('未找到任何成员数据，请先添加成员');
      }
      
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
      
      console.log('格式化后的成员数量:', formattedMembers.length);
      setMembers(formattedMembers);
      
      // 创建成员字典用于快速查找
      const memberDictionary: Record<string, Member> = {};
      formattedMembers.forEach(member => {
        memberDictionary[member.id] = member;
      });
      
      setMemberDict(memberDictionary);
      
      // 获取所有请假记录
      const leaveResults = await leaveService.getAllLeaveRecords();
      console.log('获取到的请假记录数量:', leaveResults.length);
      
      if (leaveResults.length === 0) {
        message.info('暂无请假记录');
      }
      
      const formattedLeaves = await Promise.all(leaveResults.map(async (item: any) => {
        const memberId = item.get('memberId');
        const member = memberDictionary[memberId];
        const startDate = item.get('startDate');
        const endDate = item.get('endDate');
        const duration = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
        
        // 如果找不到对应成员，记录警告信息
        if (!member) {
          console.warn(`未找到ID为 ${memberId} 的成员信息`);
        }
        
        return {
          key: item.id,
          id: item.id,
          memberId: memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qqNumber : '未知',
          reason: item.get('reason'),
          startDate: startDate,
          endDate: endDate,
          status: item.get('status'),
          createdAt: item.createdAt,
          duration: duration
        };
      }));
      
      console.log('格式化后的请假记录:', formattedLeaves.length);
      setLeaveRecords(formattedLeaves);
      setFilteredRecords(formattedLeaves);
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 处理搜索和筛选
  useEffect(() => {
    let result = [...leaveRecords];
    
    // 搜索文本过滤
    if (searchText) {
      result = result.filter(
        record => 
          record.memberName.toLowerCase().includes(searchText.toLowerCase()) ||
          record.memberQQ.includes(searchText) ||
          record.reason.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 成员筛选
    if (memberFilter) {
      result = result.filter(record => record.memberId === memberFilter);
    }
    
    // 状态筛选
    if (statusFilter) {
      result = result.filter(record => record.status === statusFilter);
    }
    
    // 按日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      result = result.filter(record => {
        const recordStartDate = dayjs(record.startDate);
        const recordEndDate = dayjs(record.endDate);
        
        // 筛选条件: 请假日期范围与选择的日期范围有重叠
        return (
          (recordStartDate.isAfter(startDate) || recordStartDate.isSame(startDate)) && 
          recordStartDate.isBefore(endDate)
        ) || (
          (recordEndDate.isAfter(startDate)) && 
          (recordEndDate.isBefore(endDate) || recordEndDate.isSame(endDate))
        ) || (
          recordStartDate.isBefore(startDate) && 
          recordEndDate.isAfter(endDate)
        );
      });
    }
    
    setFilteredRecords(result);
  }, [searchText, memberFilter, statusFilter, dateRange, leaveRecords]);

  // 查看详情
  const showDetail = (record: LeaveItem) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };
  
  // 结束请假处理
  const handleEndLeave = (record: LeaveItem) => {
    setEndingLeaveRecord(record);
    setEndLeaveModalVisible(true);
  };
  
  // 确认结束请假
  const confirmEndLeave = async () => {
    if (!endingLeaveRecord) return;
    
    try {
      setLoading(true);
      
      // 更新请假记录状态
      await leaveService.endLeaveRecord(endingLeaveRecord.id);
      
      // 更新成员状态为正常
      await memberService.updateMember(endingLeaveRecord.memberId, {
        status: MemberStatus.NORMAL
      });
      
      message.success('已成功结束请假状态');
      
      // 关闭对话框
      setEndLeaveModalVisible(false);
      setEndingLeaveRecord(null);
      
      // 刷新列表
      fetchData();
    } catch (error) {
      console.error('结束请假失败:', error);
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取请假状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case LeaveStatus.ACTIVE:
        return <Tag color="processing" icon={<ClockCircleOutlined />}>请假中</Tag>;
      case LeaveStatus.ENDED:
        return <Tag color="success" icon={<CheckCircleOutlined />}>已结束</Tag>;
      case LeaveStatus.CANCELLED:
        return <Tag color="default" icon={<CloseCircleOutlined />}>已取消</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // 定义表格列
  const columns = [
    {
      title: '成员',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: LeaveItem) => (
        <Space>
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'QQ号',
      dataIndex: 'memberQQ',
      key: 'memberQQ',
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: LeaveItem, b: LeaveItem) => dayjs(a.startDate).unix() - dayjs(b.startDate).unix()
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: LeaveItem, b: LeaveItem) => dayjs(a.endDate).unix() - dayjs(b.endDate).unix()
    },
    {
      title: '天数',
      dataIndex: 'duration',
      key: 'duration',
      render: (days: number) => (
        <Tag color={days > 30 ? 'red' : days > 14 ? 'orange' : 'green'}>
          {days} 天
        </Tag>
      ),
      sorter: (a: LeaveItem, b: LeaveItem) => a.duration - b.duration
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => getStatusTag(status),
      sorter: (a: LeaveItem, b: LeaveItem) => a.status.localeCompare(b.status)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: LeaveItem) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          
          {record.status === LeaveStatus.ACTIVE && (
            <Button 
              type="primary" 
              size="small" 
              danger
              icon={<RollbackOutlined />}
              onClick={() => handleEndLeave(record)}
            >
              结束请假
            </Button>
          )}
        </Space>
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

  // 处理表格变化（排序、筛选等）
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    // 此处可以添加处理排序和筛选的逻辑
    console.log('表格变化:', { pagination, filters, sorter });
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ClockCircleOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>请假记录</Title>
          </div>
          
          <Divider />
          
          <Space style={{ marginBottom: 16 }}>
            <Input
              placeholder="搜索成员/QQ/原因"
              prefix={<SearchOutlined />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            
            <Select
              placeholder="选择成员"
              style={{ width: 180 }}
              onChange={value => setMemberFilter(value)}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {members.map(member => (
                <Option key={member.id} value={member.id}>
                  {member.nickname} ({member.qqNumber})
                </Option>
              ))}
            </Select>
            
            <Select
              placeholder="选择状态"
              style={{ width: 120 }}
              onChange={value => setStatusFilter(value)}
              allowClear
            >
              <Option value={LeaveStatus.ACTIVE}>请假中</Option>
              <Option value={LeaveStatus.ENDED}>已结束</Option>
              <Option value={LeaveStatus.CANCELLED}>已取消</Option>
            </Select>
            
            <RangePicker 
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)} 
              placeholder={['开始日期', '结束日期']}
            />
            
            <Button 
              type="primary" 
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setMemberFilter(null);
                setStatusFilter(null);
                setDateRange(null);
              }}
            >
              重置筛选
            </Button>
            
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshData}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
          
          <StandardTable
            pageId={PAGE_ID}
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
            summary={pageData => {
              const activeCount = pageData.filter(item => item.status === LeaveStatus.ACTIVE).length;
              const endedCount = pageData.filter(item => item.status === LeaveStatus.ENDED).length;
              const cancelledCount = pageData.filter(item => item.status === LeaveStatus.CANCELLED).length;
              
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>统计信息</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={4}>
                    <Space size="large">
                      <Badge status="processing" text={`请假中: ${activeCount}`} />
                      <Badge status="success" text={`已结束: ${endedCount}`} />
                      <Badge status="default" text={`已取消: ${cancelledCount}`} />
                      <Badge status="processing" text={`总记录: ${pageData.length}`} />
                    </Space>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </Space>
      </Card>
      
      {/* 请假详情模态框 */}
      <Modal
        title="请假详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员: </Text>
                  <Text>{currentRecord.memberName}</Text>
                </div>
                <div>
                  <Text strong>QQ号: </Text>
                  <Text>{currentRecord.memberQQ}</Text>
                </div>
                <div>
                  <Text strong>成员状态: </Text>
                  <Text>{memberDict[currentRecord.memberId]?.status}</Text>
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">请假信息</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>开始日期: </Text>
                <Text>{dayjs(currentRecord.startDate).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>结束日期: </Text>
                <Text>{dayjs(currentRecord.endDate).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>请假天数: </Text>
                <Tag color={currentRecord.duration > 30 ? 'red' : currentRecord.duration > 14 ? 'orange' : 'green'}>
                  {currentRecord.duration} 天
                </Tag>
              </div>
              <div>
                <Text strong>当前状态: </Text>
                {getStatusTag(currentRecord.status)}
              </div>
              <div>
                <Text strong>创建时间: </Text>
                <Text>{dayjs(currentRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </div>
              <div>
                <Text strong>请假原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {currentRecord.reason}
                </Paragraph>
              </div>
              
              {currentRecord.status === LeaveStatus.ACTIVE && (
                <div style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    danger
                    icon={<RollbackOutlined />}
                    onClick={() => {
                      handleEndLeave(currentRecord);
                      setDetailVisible(false);
                    }}
                  >
                    提前结束请假
                  </Button>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
      
      {/* 结束请假确认对话框 */}
      <Modal
        title="确认结束请假"
        open={endLeaveModalVisible}
        onCancel={() => setEndLeaveModalVisible(false)}
        onOk={confirmEndLeave}
        confirmLoading={loading}
      >
        {endingLeaveRecord && (
          <div>
            <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>成员: </Text>
                  <Text>{endingLeaveRecord.memberName}</Text>
                </div>
                <div>
                  <Text strong>QQ号: </Text>
                  <Text>{endingLeaveRecord.memberQQ}</Text>
                </div>
                <div>
                  <Text strong>开始日期: </Text>
                  <Text>{dayjs(endingLeaveRecord.startDate).format('YYYY-MM-DD')}</Text>
                </div>
                <div>
                  <Text strong>结束日期: </Text>
                  <Text>{dayjs(endingLeaveRecord.endDate).format('YYYY-MM-DD')}</Text>
                </div>
                <div>
                  <Text strong>请假天数: </Text>
                  <Tag color={endingLeaveRecord.duration > 30 ? 'red' : endingLeaveRecord.duration > 14 ? 'orange' : 'green'}>
                    {endingLeaveRecord.duration} 天
                  </Tag>
                </div>
                <div>
                  <Text strong>当前状态: </Text>
                  {getStatusTag(endingLeaveRecord.status)}
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">请假原因</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>请假原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {endingLeaveRecord.reason}
                </Paragraph>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeaveList; 