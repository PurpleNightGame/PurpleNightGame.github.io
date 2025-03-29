import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { memberService } from '../utils/leancloud';
import { Member, MemberStage, MemberStatus } from '../types/member';
import dayjs from 'dayjs';
import locale from 'antd/es/date-picker/locale/zh_CN';

const MemberManagement = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form] = Form.useForm();

  // 获取所有成员
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
      }));
      setMembers(formattedMembers);
      message.success('成员数据加载成功');
    } catch (error: any) {
      message.error(error.message || '获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 打开添加/编辑成员模态框
  const showModal = (member?: Member) => {
    setEditingMember(member || null);
    if (member) {
      form.setFieldsValue({
        ...member,
        joinDate: member.joinDate ? dayjs(member.joinDate) : null,
        lastTrainingDate: member.lastTrainingDate ? dayjs(member.lastTrainingDate) : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: MemberStatus.NORMAL,
        stage: MemberStage.NO_TRAINING,
        blackpointCount: 0,
        isTeacher: false,
      });
    }
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCancel = () => {
    setModalVisible(false);
    setEditingMember(null);
    form.resetFields();
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const memberData = {
        ...values,
        joinDate: values.joinDate ? values.joinDate.toDate() : null,
        lastTrainingDate: values.lastTrainingDate ? values.lastTrainingDate.toDate() : null,
      };

      setLoading(true);
      if (editingMember) {
        await memberService.updateMember(editingMember.id, memberData);
        message.success('成员信息更新成功');
      } else {
        await memberService.addMember(memberData);
        message.success('成员添加成功');
      }

      setModalVisible(false);
      fetchMembers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除成员
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await memberService.deleteMember(id);
      message.success('成员删除成功');
      fetchMembers();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    } finally {
      setLoading(false);
    }
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

  // 表格列定义
  const columns = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: 'QQ号',
      dataIndex: 'qqNumber',
      key: 'qqNumber',
    },
    {
      title: '游戏ID',
      dataIndex: 'gameId',
      key: 'gameId',
      render: (text: string) => text || '-'
    },
    {
      title: '加入时间',
      dataIndex: 'joinDate',
      key: 'joinDate',
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: (a: Member, b: Member) => {
        if (!a.joinDate || !b.joinDate) return 0;
        return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
      }
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: MemberStage) => (
        <span style={{ color: getStageTagColor(stage) }}>{stage}</span>
      ),
      filters: Object.values(MemberStage).map(stage => ({ text: stage, value: stage })),
      onFilter: (value: any, record: Member) => record.stage === value
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: MemberStatus) => (
        <span style={{ color: getStatusTagColor(status) }}>{status}</span>
      ),
      filters: Object.values(MemberStatus).map(status => ({ text: status, value: status })),
      onFilter: (value: any, record: Member) => record.status === value
    },
    {
      title: '黑点数',
      dataIndex: 'blackpointCount',
      key: 'blackpointCount',
      render: (count: number) => {
        const color = count === 0 ? 'green' : count < 3 ? 'orange' : 'red';
        return <span style={{ color }}>{count}</span>;
      },
      sorter: (a: Member, b: Member) => a.blackpointCount - b.blackpointCount
    },
    {
      title: '最后新训日期',
      dataIndex: 'lastTrainingDate',
      key: 'lastTrainingDate',
      render: (date: Date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Member) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该成员吗？"
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
        <h2>成员管理</h2>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
        >
          添加成员
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={members} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingMember ? '编辑成员' : '添加成员'}
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
            name="nickname"
            label="昵称"
            rules={[
              { required: true, message: '请输入昵称' },
              { min: 2, message: '昵称至少需要2个字符' },
              { max: 20, message: '昵称最长不超过20个字符' }
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
            />
          </Form.Item>

          <Form.Item
            name="stage"
            label="阶段"
            rules={[{ required: true, message: '请选择阶段' }]}
          >
            <Select placeholder="请选择阶段">
              {Object.values(MemberStage).map(stage => (
                <Select.Option key={stage} value={stage}>{stage}</Select.Option>
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
                <Select.Option key={status} value={status}>{status}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="blackpointCount"
            label="黑点数"
            rules={[{ required: true, message: '请输入黑点数' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isTeacher"
            label="是否可教授"
            valuePropName="checked"
          >
            <Select defaultValue={false}>
              <Select.Option value={true}>是</Select.Option>
              <Select.Option value={false}>否</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={4} placeholder="请输入备注信息（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemberManagement;