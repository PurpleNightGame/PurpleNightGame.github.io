import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Divider,
  Tag, 
  Select,
  message,
  DatePicker,
  Form,
  Input
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Member, MemberStage, MemberStatus } from '../types/member';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { memberService } from '../utils/leancloud';
import { createStandardPagination, getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';

const { Title, Text } = Typography;
const { Option } = Select;

// 页面唯一标识，用于缓存分页设置
const PAGE_ID = 'training_update';

const TrainingUpdate: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState<MemberStage | 'all'>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [trainingDate, setTrainingDate] = useState<dayjs.Dayjs>(dayjs());
  const [updatingTraining, setUpdatingTraining] = useState(false);
  const [searchText, setSearchText] = useState('');
  // 添加排序状态
  const [sortInfo, setSortInfo] = useState<{
    field: string | null;
    order: 'ascend' | 'descend' | null;
  }>({
    field: null,
    order: null
  });
  // 使用缓存初始化分页状态
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(PAGE_ID),
    total: 0
  }));

  // 获取所有成员
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await memberService.getAllMembers();
      
      const formattedMembers = result.map((item: any) => ({
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
      }));
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('获取成员列表失败:', error);
      message.error('获取成员列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

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

  // 筛选成员
  const getFilteredMembers = () => {
    let result = members.filter(member => {
      // 搜索文本匹配
      const matchesSearch = 
        searchText === '' || 
        member.nickname.toLowerCase().includes(searchText.toLowerCase()) ||
        member.qqNumber.includes(searchText) ||
        (member.gameId && member.gameId.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesStage = stageFilter === 'all' || member.stage === stageFilter;
      const isActive = member.status !== MemberStatus.QUIT; // 排除已退队成员
      return matchesSearch && matchesStage && isActive;
    });

    // 应用排序
    if (sortInfo.field && sortInfo.order) {
      const { field, order } = sortInfo;
      
      result.sort((a, b) => {
        let comparison = 0;
        
        // 根据不同字段类型处理排序
        if (field === 'nickname' || field === 'qqNumber' || field === 'gameId') {
          // 字符串排序
          const aValue = (a[field as keyof Member] || '').toString().toLowerCase();
          const bValue = (b[field as keyof Member] || '').toString().toLowerCase();
          comparison = aValue.localeCompare(bValue);
        } else if (field === 'stage') {
          // 阶段排序（可以根据枚举顺序自定义排序逻辑）
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
        } else if (field === 'status') {
          // 状态排序
          const statusOrder = {
            [MemberStatus.NORMAL]: 1,
            [MemberStatus.ON_LEAVE]: 2,
            [MemberStatus.QUIT]: 3,
          };
          comparison = statusOrder[a.status] - statusOrder[b.status];
        } else if (field === 'lastTrainingDate') {
          // 日期排序
          const aDate = a.lastTrainingDate ? new Date(a.lastTrainingDate).getTime() : 0;
          const bDate = b.lastTrainingDate ? new Date(b.lastTrainingDate).getTime() : 0;
          comparison = aDate - bDate;
        } else if (field === 'daysSinceLastTraining') {
          // 天数排序
          const aDays = a.lastTrainingDate ? dayjs().diff(dayjs(a.lastTrainingDate), 'day') : Number.MAX_SAFE_INTEGER;
          const bDays = b.lastTrainingDate ? dayjs().diff(dayjs(b.lastTrainingDate), 'day') : Number.MAX_SAFE_INTEGER;
          comparison = aDays - bDays;
        }
        
        return order === 'ascend' ? comparison : -comparison;
      });
    }
    
    return result;
  };

  // 批量更新训练日期
  const handleBatchUpdateTrainingDate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一名成员');
      return;
    }

    setUpdatingTraining(true);
    
    // 跟踪阶段被自动更新的成员
    const stageUpdatedMembers: string[] = [];

    try {
      // 创建更新操作的Promise数组
      const updatePromises = selectedRowKeys.map(async (memberId) => {
        try {
          // 使用原生 JavaScript Date 对象
          const dateObject = trainingDate.toDate();
          
          // 查找当前成员，判断是否需要更新阶段
          const currentMember = members.find(m => m.id === memberId);
          if (!currentMember) {
            console.error(`未找到成员: ${memberId}`);
            return false;
          }
          
          // 更新数据对象
          const updateData: any = {
            lastTrainingDate: dateObject
          };
          
          // 如果成员之前没有参加过新训，则将其阶段设置为新训初期
          if (currentMember.stage === MemberStage.NO_TRAINING) {
            updateData.stage = MemberStage.NEW_TRAINING_INITIAL;
            // 记录已自动更新阶段的成员
            stageUpdatedMembers.push(currentMember.nickname);
          }
          
          await memberService.updateMember(memberId, updateData);
          return true;
        } catch (error) {
          console.error(`更新成员 ${memberId} 失败:`, error);
          return false;
        }
      });
      
      // 等待所有更新完成
      const results = await Promise.all(updatePromises);
      const successCount = results.filter(result => result).length;
      
      if (successCount === selectedRowKeys.length) {
        message.success(`已成功更新 ${successCount} 名成员的新训日期`);
      } else {
        message.warning(`部分更新成功: ${successCount}/${selectedRowKeys.length} 名成员已更新`);
      }
      
      // 如果有成员的阶段被自动更新，显示提示信息
      if (stageUpdatedMembers.length > 0) {
        message.info(
          <>
            <div>以下成员的阶段已自动更新为新训初期：</div>
            <div>{stageUpdatedMembers.join('、')}</div>
          </>
        );
      }
      
      // 重新获取成员列表以显示最新数据
      fetchMembers();
      // 清空选择
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('批量更新失败:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setUpdatingTraining(false);
    }
  };

  // 添加分页变化处理函数
  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize
    }));
  };

  // 添加表格变化处理函数
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
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
      render: (stage: MemberStage) => (
        <Tag color={getStageTagColor(stage)}>{stage}</Tag>
      ),
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: MemberStatus) => {
        let color = 'green';
        if (status === MemberStatus.ON_LEAVE) color = 'orange';
        if (status === MemberStatus.QUIT) color = 'red';
        return <Tag color={color}>{status}</Tag>;
      },
      sorter: true,
    },
    {
      title: '最后新训日期',
      dataIndex: 'lastTrainingDate',
      key: 'lastTrainingDate',
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: true,
    },
    {
      title: '天数',
      key: 'daysSinceLastTraining',
      render: (_: any, record: Member) => {
        if (!record.lastTrainingDate) return <Tag color="red">从未新训</Tag>;
        
        const days = dayjs().diff(dayjs(record.lastTrainingDate), 'day');
        let color = 'green';
        if (days > 3) color = 'gold';
        if (days > 5) color = 'orange';
        if (days > 7) color = 'red';
        
        return <Tag color={color}>{days} 天</Tag>;
      },
      sorter: true,
    },
  ];

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    preserveSelectedRowKeys: true,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CalendarOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>更新新训日期</Title>
          </div>
          
          <Divider />
          
          <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8 }}>
            <Space direction="vertical" size="small">
              <Text strong>批量更新新训日期</Text>
              <Text type="secondary">选择成员并设置新训日期，点击"更新"按钮批量更新所选成员的最后一次新训日期。</Text>
            </Space>
          </div>
          
          <Form layout="inline">
            <Form.Item label="成员搜索">
              <Input
                placeholder="搜索昵称/QQ号/游戏ID"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
            </Form.Item>
            
            <Form.Item label="阶段筛选">
              <Select 
                placeholder="选择阶段" 
                style={{ width: 150 }}
                value={stageFilter}
                onChange={value => setStageFilter(value)}
              >
                <Option value="all">全部阶段</Option>
                {Object.values(MemberStage).map(stage => (
                  <Option key={stage} value={stage}>{stage}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="新训日期">
              <DatePicker 
                locale={locale}
                value={trainingDate}
                onChange={value => setTrainingDate(value || dayjs())}
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                onClick={handleBatchUpdateTrainingDate} 
                loading={updatingTraining}
                disabled={selectedRowKeys.length === 0}
                icon={<CheckCircleOutlined />}
              >
                更新 ({selectedRowKeys.length})
              </Button>
            </Form.Item>
          </Form>
          
          <StandardTable 
            pageId={PAGE_ID}
            rowSelection={rowSelection}
            columns={columns} 
            dataSource={getFilteredMembers()} 
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
          />
        </Space>
      </Card>
    </div>
  );
};

export default TrainingUpdate; 