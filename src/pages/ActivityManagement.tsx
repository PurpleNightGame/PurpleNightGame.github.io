import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Activity, ActivityStatus } from '../types';
import dayjs from 'dayjs';
import AV from 'leancloud-storage';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const ActivityManagement = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form] = Form.useForm();

  // 获取所有活动
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const query = new AV.Query('Activity');
      const result = await query.find();
      const formattedActivities = result.map((item: any) => ({
        id: item.id,
        name: item.get('name'),
        description: item.get('description'),
        startTime: new Date(item.get('startTime')),
        endTime: new Date(item.get('endTime')),
        participants: item.get('participants') || [],
        status: item.get('status'),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
      setActivities(formattedActivities);
    } catch (error: any) {
      message.error(error.message || '获取活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // 打开添加/编辑活动模态框
  const showModal = (activity?: Activity) => {
    setEditingActivity(activity || null);
    if (activity) {
      form.setFieldsValue({
        ...activity,
        timeRange: [dayjs(activity.startTime), dayjs(activity.endTime)]
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingActivity(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const activityData = {
        name: values.name,
        description: values.description,
        startTime: values.timeRange[0].toDate(),
        endTime: values.timeRange[1].toDate(),
        participants: values.participants || [],
        status: values.status
      };

      setLoading(true);
      const Activity = AV.Object.extend('Activity');

      if (editingActivity) {
        const activity = AV.Object.createWithoutData('Activity', editingActivity.id);
        Object.keys(activityData).forEach(key => {
          activity.set(key, activityData[key]);
        });
        await activity.save();
        message.success('活动信息更新成功');
      } else {
        const activity = new Activity();
        Object.keys(activityData).forEach(key => {
          activity.set(key, activityData[key]);
        });
        await activity.save();
        message.success('活动添加成功');
      }

      setModalVisible(false);
      fetchActivities();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除活动
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const activity = AV.Object.createWithoutData('Activity', id);
      await activity.destroy();
      message.success('活动删除成功');
      fetchActivities();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取活动状态标签
  const getStatusTag = (status: ActivityStatus) => {
    const statusMap = {
      [ActivityStatus.UPCOMING]: { text: '即将开始', color: 'blue' },
      [ActivityStatus.ONGOING]: { text: '进行中', color: 'green' },
      [ActivityStatus.COMPLETED]: { text: '已完成', color: 'gray' },
      [ActivityStatus.CANCELLED]: { text: '已取消', color: 'red' },
    };
    return <span style={{ color: statusMap[status].color }}>{statusMap[status].text}</span>;
  };

  // 表格列定义
  const columns = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Activity, b: Activity) => a.startTime.getTime() - b.startTime.getTime()
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Activity, b: Activity) => a.endTime.getTime() - b.endTime.getTime()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ActivityStatus) => getStatusTag(status),
      filters: [
        { text: '即将开始', value: ActivityStatus.UPCOMING },
        { text: '进行中', value: ActivityStatus.ONGOING },
        { text: '已完成', value: ActivityStatus.COMPLETED },
        { text: '已取消', value: ActivityStatus.CANCELLED },
      ],
      onFilter: (value: string, record: Activity) => record.status === value
    },
    {
      title: '参与人数',
      key: 'participants',
      render: (record: Activity) => record.participants.length,
      sorter: (a: Activity, b: Activity) => a.participants.length - b.participants.length
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Activity) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该活动吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>活动管理</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
        >
          添加活动
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={activities} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) => (
            <p style={{ margin: 0 }}>{record.description}</p>
          ),
        }}
      />

      <Modal
        title={editingActivity ? '编辑活动' : '添加活动'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="活动名称"
            rules={[{ required: true, message: '请输入活动名称!' }]}
          >
            <Input placeholder="请输入活动名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="活动描述"
            rules={[{ required: true, message: '请输入活动描述!' }]}
          >
            <TextArea rows={4} placeholder="请输入活动描述" />
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="活动时间"
            rules={[{ required: true, message: '请选择活动时间!' }]}
          >
            <RangePicker 
              showTime 
              format="YYYY-MM-DD HH:mm" 
              style={{ width: '100%' }} 
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="活动状态"
            rules={[{ required: true, message: '请选择活动状态!' }]}
          >
            <Select placeholder="请选择活动状态">
              <Select.Option value={ActivityStatus.UPCOMING}>即将开始</Select.Option>
              <Select.Option value={ActivityStatus.ONGOING}>进行中</Select.Option>
              <Select.Option value={ActivityStatus.COMPLETED}>已完成</Select.Option>
              <Select.Option value={ActivityStatus.CANCELLED}>已取消</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActivityManagement;