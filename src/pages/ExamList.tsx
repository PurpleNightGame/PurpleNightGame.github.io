import React, { useState, useEffect } from 'react';
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
  message,
  Tooltip,
  Form,
  DatePicker
} from 'antd';
import { 
  SearchOutlined, 
  TrophyOutlined, 
  MoreOutlined, 
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import { Member, ExamRecord, ExamStatus } from '../types/member';
import dayjs from 'dayjs';
import AV from 'leancloud-storage';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { memberService, examService } from '../utils/leancloud';
import { getPaginationFromCache } from '../utils/paginationUtil';
import StandardTable from '../components/StandardTable';
import * as XLSX from 'xlsx';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 页面唯一标识，用于缓存分页设置
const PAGE_ID = 'exam_list';

// 考核地图列表
const examMaps = [
  '加油站',
  '蜘蛛',
  '213公寓',
  '海滨公寓',
  '大学',
  '医院',
  '自定义'
];

const ExamList: React.FC = () => {
  const [examRecords, setExamRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [form] = Form.useForm();
  // 添加自定义地图状态
  const [isCustomMap, setIsCustomMap] = useState(false);
  // 使用缓存初始化分页状态
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(PAGE_ID),
    total: 0
  }));

  // 获取考核记录
  const fetchExamRecords = async () => {
    try {
      setLoading(true);
      const result = await examService.getAllExams();
      
      const formattedRecords = result.map((item: any) => ({
        key: item.id,
        id: item.id,
        memberId: item.get('memberId'),
        memberName: item.get('memberName') || '未知成员',
        mapName: item.get('mapName'),
        status: item.get('status'),
        passDate: item.get('passDate'),
        score: item.get('score'),
        comment: item.get('comment') || '',
        createdAt: item.createdAt,
      }));
      
      setExamRecords(formattedRecords);
    } catch (error) {
      console.error('获取考核记录失败:', error);
      message.error('获取考核记录失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 获取所有成员
  const fetchMembers = async () => {
    try {
      const result = await memberService.getAllMembers();
      
      // 显式转换为所需要的部分属性，以解决类型错误
      const formattedMembers = result.map((item: any) => ({
        id: item.id,
        nickname: item.get('nickname'),
        stage: item.get('stage'),
        // 由于这些字段在这个组件中没有使用，可以设置默认值
        qqNumber: item.get('qqNumber') || '',
        joinDate: item.get('joinDate') || new Date(),
        status: item.get('status') || '',
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false
      }));
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('获取成员列表失败:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    fetchExamRecords();
    fetchMembers();
  }, []);

  // 刷新数据
  const handleRefresh = () => {
    fetchExamRecords();
    message.success('数据已刷新');
  };

  // 获取考核状态标签颜色
  const getStatusTagColor = (status: ExamStatus) => {
    switch (status) {
      case ExamStatus.PASSED:
        return 'success';
      case ExamStatus.FAILED:
        return 'error';
      case ExamStatus.IN_PROGRESS:
        return 'processing';
      default:
        return 'default';
    }
  };

  // 搜索和筛选
  const getFilteredExams = () => {
    return examRecords.filter(exam => {
      const matchesSearch = 
        searchText === '' || 
        exam.memberName.toLowerCase().includes(searchText.toLowerCase()) ||
        exam.mapName.toLowerCase().includes(searchText.toLowerCase()) ||
        (exam.comment && exam.comment.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  // 打开编辑模态框
  const showEditModal = (record: any) => {
    setCurrentExam(record);
    
    // 检查当前地图是否为预定义地图之一
    const isPredefinedMap = examMaps.includes(record?.mapName);
    const mapName = isPredefinedMap ? record?.mapName : '自定义';
    const customMapName = !isPredefinedMap ? record?.mapName : undefined;
    
    form.setFieldsValue({
      ...record,
      mapName,
      customMapName,
      passDate: record.passDate ? dayjs(record.passDate) : null,
    });
    
    setIsCustomMap(!isPredefinedMap);
    setEditModalVisible(true);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditModalVisible(false);
    setCurrentExam(null);
    form.resetFields();
    setIsCustomMap(false);
  };

  // 处理地图选择变化
  const handleMapChange = (value: string) => {
    setIsCustomMap(value === '自定义');
    // 清空自定义地图名称
    if (value !== '自定义') {
      form.setFieldValue('customMapName', undefined);
    }
  };

  // 保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理自定义地图名称
      let finalMapName = values.mapName;
      if (values.mapName === '自定义' && values.customMapName) {
        finalMapName = values.customMapName;
      }

      setLoading(true);
      const updatedData = {
        ...values,
        mapName: finalMapName,
        passDate: values.passDate ? values.passDate.toDate() : null,
        memberName: members.find(m => m.id === values.memberId)?.nickname || '未知成员',
      };

      if (currentExam && currentExam.id) {
        // 更新现有记录
        await examService.updateExam(currentExam.id, updatedData);
        message.success('考核记录更新成功');
      } else {
        // 创建新记录
        await examService.createExam(updatedData);
        message.success('考核记录创建成功');
      }
      
      setEditModalVisible(false);
      fetchExamRecords();
    } catch (error) {
      console.error('操作考核记录失败:', error);
      message.error('操作失败，请检查表单填写是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 删除考核记录
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '删除考核记录',
      content: '确定要删除这条考核记录吗？此操作不可恢复。',
      onOk: async () => {
        try {
          setLoading(true);
          await examService.deleteExam(id);
          message.success('考核记录已删除');
          fetchExamRecords();
        } catch (error) {
          console.error('删除考核记录失败:', error);
          message.error('删除失败，请重试');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 添加新考核记录
  const handleAddExam = () => {
    setCurrentExam(null);
    form.resetFields();
    form.setFieldsValue({
      status: ExamStatus.IN_PROGRESS,
      mapName: examMaps[0], // 默认选择第一个地图
      passDate: null,
      score: null,
    });
    setIsCustomMap(false);
    setEditModalVisible(true);
  };

  // 添加导出Excel的函数
  const handleExportExcel = () => {
    try {
      const filteredData = getFilteredExams();
      if (filteredData.length === 0) {
        message.warning('没有数据可导出');
        return;
      }

      // 准备要导出的数据
      const exportData = filteredData.map(exam => ({
        '成员昵称': exam.memberName,
        '考核地图': exam.mapName,
        '状态': exam.status,
        '通过日期': exam.passDate ? dayjs(exam.passDate).format('YYYY-MM-DD') : '-',
        '评分': exam.score !== null ? exam.score : '-',
        '教授权限': exam.passDate ? 
          (dayjs().isAfter(dayjs(exam.passDate).add(1, 'month')) ? '允许教授' : '观察期') : 
          '-',
        '评价': exam.comment || ''
      }));

      // 创建工作簿和工作表
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // 设置列宽
      const columnWidths = [
        { wch: 15 }, // 成员昵称
        { wch: 15 }, // 考核地图
        { wch: 10 }, // 状态
        { wch: 12 }, // 通过日期
        { wch: 8 },  // 评分
        { wch: 10 }, // 教授权限
        { wch: 30 }  // 评价
      ];
      ws['!cols'] = columnWidths;

      // 将工作表添加到工作簿并导出
      XLSX.utils.book_append_sheet(wb, ws, '考核记录');
      XLSX.writeFile(wb, `考核记录_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      
      message.success('考核记录已导出为Excel文件');
    } catch (error) {
      console.error('导出Excel失败:', error);
      message.error('导出Excel失败，请重试');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '成员昵称',
      dataIndex: 'memberName',
      key: 'memberName',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: '考核地图',
      dataIndex: 'mapName',
      key: 'mapName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ExamStatus) => (
        <Tag color={getStatusTagColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '通过日期',
      dataIndex: 'passDate',
      key: 'passDate',
      render: (date: Date | null) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number | null) => score !== null ? score : '-',
    },
    {
      title: '教授权限',
      key: 'teachingPermission',
      render: (_: any, record: any) => {
        if (record.status !== ExamStatus.PASSED || !record.passDate) {
          return '-';
        }
        
        const passDate = dayjs(record.passDate);
        const oneMonthAfterPass = passDate.add(1, 'month');
        const now = dayjs();
        
        if (now.isAfter(oneMonthAfterPass)) {
          return <Tag color="green">允许教授</Tag>;
        } else {
          return <Tag color="orange">观察期</Tag>;
        }
      },
    },
    {
      title: '评价',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Dropdown menu={{ 
          items: [
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => showEditModal(record),
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              onClick: () => handleDelete(record.id),
              danger: true,
            },
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

  // 处理表格变化（排序、筛选等）
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    // 此处可以添加处理排序和筛选的逻辑
    console.log('表格变化:', { pagination, filters, sorter });
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TrophyOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
              <Title level={4} style={{ margin: 0 }}>考核记录</Title>
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
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddExam}
              >
                添加考核记录
              </Button>
            </Space>
          </div>
          
          <Divider />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space>
              <Input
                placeholder="搜索成员/地图/评价"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 220 }}
              />
              <Select 
                placeholder="状态筛选" 
                style={{ width: 120 }}
                value={statusFilter}
                onChange={value => setStatusFilter(value)}
              >
                <Option value="all">全部状态</Option>
                {Object.values(ExamStatus).map(status => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Space>
          </div>
          
          <StandardTable 
            pageId={PAGE_ID}
            columns={columns} 
            dataSource={getFilteredExams()} 
            rowKey="id"
            loading={loading}
            onChange={handleTableChange}
          />
        </Space>
      </Card>
      
      {/* 编辑/添加考核记录模态框 */}
      <Modal
        title={currentExam ? '编辑考核记录' : '添加考核记录'}
        open={editModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={loading} 
            onClick={handleSave}
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
            name="memberId"
            label="成员"
            rules={[{ required: true, message: '请选择成员' }]}
          >
            <Select placeholder="请选择成员">
              {members.map(member => (
                <Option key={member.id} value={member.id}>{member.nickname}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="mapName"
            label="考核地图"
            rules={[{ required: true, message: '请选择考核地图' }]}
          >
            <Select 
              placeholder="请选择考核地图"
              onChange={handleMapChange}
            >
              {examMaps.map(map => (
                <Option key={map} value={map}>{map}</Option>
              ))}
            </Select>
          </Form.Item>
          
          {isCustomMap && (
            <Form.Item
              name="customMapName"
              label="自定义地图名称"
              rules={[{ required: true, message: '请输入自定义地图名称' }]}
            >
              <Input placeholder="请输入自定义地图名称" />
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label="考核状态"
            rules={[{ required: true, message: '请选择考核状态' }]}
          >
            <Select placeholder="请选择考核状态">
              {Object.values(ExamStatus).map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="passDate"
            label="通过日期"
          >
            <DatePicker 
              locale={locale}
              style={{ width: '100%' }} 
              placeholder="请选择通过日期（如已通过）"
              disabledDate={date => date && date.isAfter(dayjs())}
            />
          </Form.Item>

          <Form.Item
            name="score"
            label="评分"
          >
            <Input type="number" min={0} max={100} placeholder="请输入评分（0-100）" />
          </Form.Item>

          <Form.Item
            name="comment"
            label="评价"
          >
            <TextArea 
              placeholder="请输入考核评价"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExamList; 