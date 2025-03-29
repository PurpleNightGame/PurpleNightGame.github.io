import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  message, 
  Typography, 
  Space,
  Divider,
  Alert
} from 'antd';
import { ExceptionOutlined, SaveOutlined } from '@ant-design/icons';
import { Member, BlackpointRecord } from '../types/member';
import dayjs from 'dayjs';
import AV from 'leancloud-storage';
import { memberService, blackpointService } from '../utils/leancloud';
import locale from 'antd/es/date-picker/locale/zh_CN';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const BlackpointRegister: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
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
      }));
      
      setMembers(formattedMembers);
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

  // 选择成员时更新选中的成员信息
  const handleMemberChange = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    setSelectedMember(member || null);
    form.setFieldValue('date', dayjs());
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      if (!selectedMember) {
        message.error('请选择成员');
        return;
      }
      
      // 创建黑点记录
      const blackpointData: Partial<BlackpointRecord> = {
        memberId: selectedMember.id,
        reason: values.reason,
        date: values.date.toDate(),
        isActive: true,
        registrar: values.registrar || '未知'
      };
      
      await blackpointService.createBlackpoint(blackpointData);
      
      // 更新成员黑点数量
      await memberService.updateMember(
        selectedMember.id, 
        { blackpointCount: selectedMember.blackpointCount + 1 }
      );
      
      // 如果黑点数量达到4个，显示警告
      const newBlackpointCount = selectedMember.blackpointCount + 1;
      if (newBlackpointCount >= 4) {
        message.warning(`${selectedMember.nickname} 的黑点数量已达到 ${newBlackpointCount} 个，请考虑将其加入退队审批。`);
      }
      
      message.success('黑点登记成功');
      setSubmitSuccess(true);
      
      // 重置表单
      form.resetFields();
      setSelectedMember(null);
      
      // 刷新成员列表
      fetchMembers();
      
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('黑点登记失败:', error);
      message.error('黑点登记失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ExceptionOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>登记黑点</Title>
          </div>
          
          <Divider />
          
          {submitSuccess && (
            <Alert
              message="黑点登记成功"
              description="已成功为成员登记黑点并更新黑点数量。"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              date: dayjs(),
              registrar: '',
            }}
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
                loading={loading}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {members.map(member => (
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
                    <Text strong>当前成员: </Text>
                    <Text>{selectedMember.nickname}</Text>
                  </div>
                  <div>
                    <Text strong>QQ号: </Text>
                    <Text>{selectedMember.qqNumber}</Text>
                  </div>
                  <div>
                    <Text strong>当前黑点数量: </Text>
                    <Text 
                      style={{ 
                        color: selectedMember.blackpointCount >= 3 ? 'red' : 
                               selectedMember.blackpointCount > 0 ? 'orange' : 'green' 
                      }}
                    >
                      {selectedMember.blackpointCount}
                    </Text>
                  </div>
                  {selectedMember.blackpointCount >= 3 && (
                    <Alert 
                      message="警告" 
                      description="该成员黑点数量已达到或超过3个，请注意！" 
                      type="warning" 
                      showIcon 
                    />
                  )}
                </Space>
              </div>
            )}
            
            <Form.Item
              name="reason"
              label="黑点原因"
              rules={[
                { required: true, message: '请输入黑点原因' }
              ]}
            >
              <TextArea 
                placeholder="请输入黑点原因"
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </Form.Item>
            
            <Form.Item
              name="registrar"
              label="登记人"
              rules={[
                { required: true, message: '请输入登记人姓名' }
              ]}
              tooltip="登记黑点的管理员姓名或昵称，用于记录谁登记了这个黑点"
            >
              <Input placeholder="请输入登记人姓名或昵称" />
            </Form.Item>
            
            <Form.Item
              name="date"
              label="登记日期"
              rules={[{ required: true, message: '请选择登记日期' }]}
            >
              <DatePicker 
                style={{ width: '100%' }} 
                locale={locale}
                format="YYYY-MM-DD"
                disabledDate={date => date && date.isAfter(dayjs())}
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
                style={{ width: '100%' }}
              >
                登记黑点
              </Button>
            </Form.Item>
          </Form>
          
          <Divider />
          
          <div>
            <Title level={5}>黑点规则说明</Title>
            <ul>
              <li>黑点是对成员违反公会规定的行为进行的记录和惩罚</li>
              <li>黑点有效期为一个月，一个月后自动消除</li>
              <li>累计 3 个黑点会收到警告</li>
              <li>累计 4 个黑点将进入退队审批流程</li>
              <li>请确保黑点登记有充分理由和证据</li>
              <li>每个黑点必须记录登记人，以便追踪黑点的来源和责任</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default BlackpointRegister; 