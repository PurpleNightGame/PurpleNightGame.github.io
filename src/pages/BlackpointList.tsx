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
  Badge,
  DatePicker
} from 'antd';
import { 
  SearchOutlined, 
  ExceptionOutlined, 
  EyeOutlined, 
  ReloadOutlined, 
  FilterOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import AV from 'leancloud-storage';
import { BlackpointRecord, Member, MemberStatus, MemberStage } from '../types/member';
import { memberService, blackpointService } from '../utils/leancloud';
import dayjs from 'dayjs';
import { getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BlackpointItem {
  key: string;
  id: string;
  memberId: string;
  memberName: string;
  memberQQ: string;
  reason: string;
  date: Date;
  isActive: boolean;
  createdAt: Date;
}

// 页面唯一标识，用于缓存分页设置
const PAGE_ID = 'blackpoint_list';

const BlackpointList: React.FC = () => {
  const [blackpointRecords, setBlackpointRecords] = useState<BlackpointItem[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BlackpointItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<BlackpointItem | null>(null);
  const [memberDict, setMemberDict] = useState<{[key: string]: {nickname: string, qqNumber: string, blackpointCount: number}}>({});
  // 使用缓存初始化分页状态
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(PAGE_ID),
    total: 0
  }));

  // 获取所有黑点记录
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
        blackpointCount: item.get('blackpointCount') || 0,
        // 补充类型所需的其他字段
        gameId: item.get('gameId') || '',
        joinDate: item.get('joinDate') || new Date(),
        stage: item.get('stage') || MemberStage.NO_TRAINING,
        status: item.get('status') || MemberStatus.NORMAL,
        isTeacher: item.get('isTeacher') || false,
      }));
      
      // 创建成员字典
      const memberDictionary: {[key: string]: {nickname: string, qqNumber: string, blackpointCount: number}} = {};
      formattedMembers.forEach(member => {
        memberDictionary[member.id] = member;
      });
      
      setMemberDict(memberDictionary);
      
      // 获取所有黑点记录
      const blackpointResults = await blackpointService.getAllBlackpoints();
      const formattedRecords = blackpointResults.map((item: any) => {
        const memberId = item.get('memberId');
        const member = memberDictionary[memberId];
        
        return {
          key: item.id,
          id: item.id,
          memberId: memberId,
          memberName: member ? member.nickname : '未知成员',
          memberQQ: member ? member.qqNumber : '未知',
          reason: item.get('reason') || '',
          date: item.get('date'),
          isActive: item.get('isActive'),
          createdAt: item.createdAt
        };
      });
      
      setBlackpointRecords(formattedRecords);
      setFilteredRecords(formattedRecords);
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    fetchData();
  }, []);

  // 处理搜索和筛选
  useEffect(() => {
    let result = [...blackpointRecords];
    
    // 搜索文本过滤
    if (searchText) {
      result = result.filter(
        record => 
          record.memberName.toLowerCase().includes(searchText.toLowerCase()) ||
          record.memberQQ.includes(searchText) ||
          record.reason.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 状态筛选
    if (statusFilter !== null) {
      result = result.filter(record => record.isActive === statusFilter);
    }
    
    setFilteredRecords(result);
  }, [searchText, statusFilter, blackpointRecords]);

  // 查看详情
  const showDetail = (record: BlackpointItem) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  // 定义表格列
  const columns = [
    {
      title: '成员',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string, record: BlackpointItem) => (
        <Space>
          <span>{text}</span>
          {memberDict[record.memberId]?.blackpointCount >= 3 && (
            <Tooltip title="黑点数量已达到或超过3个，请注意！">
              <ExclamationCircleOutlined style={{ color: 'red' }} />
            </Tooltip>
          )}
        </Space>
      ),
      sorter: (a: BlackpointItem, b: BlackpointItem) => a.memberName.localeCompare(b.memberName)
    },
    {
      title: 'QQ号',
      dataIndex: 'memberQQ',
      key: 'memberQQ',
    },
    {
      title: '黑点原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (text: string) => (
        <Tooltip title={text}>
          <div className="ellipsis" style={{ maxWidth: 200 }}>
            {text.length > 30 ? `${text.substring(0, 30)}...` : text}
          </div>
        </Tooltip>
      )
    },
    {
      title: '登记日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: BlackpointItem, b: BlackpointItem) => dayjs(a.date).unix() - dayjs(b.date).unix()
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'error' : 'default'}>
          {isActive ? '生效中' : '已失效'}
        </Tag>
      ),
      sorter: (a: BlackpointItem, b: BlackpointItem) => Number(a.isActive) - Number(b.isActive)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: BlackpointItem) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EyeOutlined />} 
          onClick={() => showDetail(record)}
        >
          详情
        </Button>
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
            <ExceptionOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>黑点记录</Title>
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
              placeholder="选择状态"
              style={{ width: 120 }}
              onChange={value => setStatusFilter(value)}
              allowClear
            >
              <Option value={true}>生效中</Option>
              <Option value={false}>已失效</Option>
            </Select>
            
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
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
              const totalActive = pageData.filter(item => item.isActive).length;
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>统计信息</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={4}>
                    <Space size="large">
                      <Badge status="processing" text={`总黑点数: ${pageData.length}`} />
                      <Badge status="error" text={`有效黑点: ${totalActive}`} />
                      <Badge status="default" text={`失效黑点: ${pageData.length - totalActive}`} />
                    </Space>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </Space>
      </Card>
      
      {/* 黑点详情模态框 */}
      <Modal
        title="黑点详情"
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
                  <Text strong>当前黑点总数: </Text>
                  <Text 
                    style={{ 
                      color: memberDict[currentRecord.memberId]?.blackpointCount >= 3 ? 'red' : 
                             memberDict[currentRecord.memberId]?.blackpointCount > 0 ? 'orange' : 'green' 
                    }}
                  >
                    {memberDict[currentRecord.memberId]?.blackpointCount || 0}
                  </Text>
                </div>
              </Space>
            </div>
            
            <Divider orientation="left">黑点信息</Divider>
            
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>登记日期: </Text>
                <Text>{dayjs(currentRecord.date).format('YYYY-MM-DD')}</Text>
              </div>
              <div>
                <Text strong>创建时间: </Text>
                <Text>{dayjs(currentRecord.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
              </div>
              <div>
                <Text strong>状态: </Text>
                <Tag color={currentRecord.isActive ? 'error' : 'default'}>
                  {currentRecord.isActive ? '生效中' : '已失效'}
                </Tag>
              </div>
              <div>
                <Text strong>黑点原因: </Text>
                <Paragraph style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {currentRecord.reason}
                </Paragraph>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BlackpointList; 