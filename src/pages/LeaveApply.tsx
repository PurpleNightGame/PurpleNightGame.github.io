import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  DatePicker,
  Typography,
  message,
  Divider,
  Select,
  Alert,
  Switch,
  Tooltip
} from 'antd';
import { UserOutlined, CalendarOutlined, EnvironmentOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { RangePickerProps } from 'antd/es/date-picker';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { Member, MemberStatus, LeaveRecord } from '../types/member';
import { memberService, leaveService } from '../utils/leancloud';
import { useMessage } from '../utils/messageUtil';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

// 定义请假类型
const leaveTypes = [
  { value: 'personal', label: '个人事务' },
  { value: 'sick', label: '生病请假' },
  { value: 'study', label: '学习休息' },
  { value: 'travel', label: '出差/旅行' },
  { value: 'other', label: '其他' },
];

const LeaveApply: React.FC = () => {
  const [form] = Form.useForm();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [allowPastDates, setAllowPastDates] = useState(false);
  const message = useMessage();

  // 使用useEffect加载数据，但添加isMounted标志避免重复加载
  useEffect(() => {
    let isMounted = true;
    
    const loadMembers = async () => {
      try {
        setLoading(true);
        const result = await memberService.getAllMembers();
        
        if (!isMounted) return;
        
        console.log('获取成员列表结果:', result.length);
        
        // 格式化成员数据
        const formattedMembers = result.map((item: any) => ({
          key: item.id,
          id: item.id,
          nickname: item.get('nickname') || '',
          qqNumber: item.get('qqNumber') || '',
          gameId: item.get('gameId') || '',
          joinDate: item.get('joinDate') || new Date(),
          stage: item.get('stage') || '',
          status: item.get('status') || MemberStatus.NORMAL,
          lastTrainingDate: item.get('lastTrainingDate'),
          blackpointCount: item.get('blackpointCount') || 0,
          isTeacher: item.get('isTeacher') || false,
        }));
        
        if (!isMounted) return;
        
        console.log('格式化后的成员数据:', formattedMembers.length);
        
        // 仅保留状态正常的成员（明确排除已请假的成员）
        const activeMembers = formattedMembers.filter(member => 
          member.status === MemberStatus.NORMAL
        );
        
        if (!isMounted) return;
        
        console.log('状态正常的成员数量:', activeMembers.length);
        
        if (activeMembers.length === 0) {
          // 如果没有状态正常的成员，显示空列表并提示
          console.log('没有可申请请假的成员');
          setMembers([]);
          
          // 显示警告消息
          if (isMounted) {
            message.warning('未找到状态正常的成员，请联系管理员');
          }
        } else {
          setMembers(activeMembers);
        }
      } catch (error) {
        console.error('获取成员列表失败:', error);
        if (isMounted) {
          message.error('获取成员列表失败，请检查网络连接');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMembers();
    
    // 组件卸载时清理
    return () => {
      isMounted = false;
    };
  }, []);

  // 保留原有的fetchMembers函数用于刷新
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await memberService.getAllMembers();
      
      console.log('获取成员列表结果:', result.length);
      
      // 格式化成员数据
      const formattedMembers = result.map((item: any) => ({
        key: item.id,
        id: item.id,
        nickname: item.get('nickname') || '',
        qqNumber: item.get('qqNumber') || '',
        gameId: item.get('gameId') || '',
        joinDate: item.get('joinDate') || new Date(),
        stage: item.get('stage') || '',
        status: item.get('status') || MemberStatus.NORMAL,
        lastTrainingDate: item.get('lastTrainingDate'),
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false,
      }));
      
      console.log('格式化后的成员数据:', formattedMembers.length);
      
      // 仅保留状态正常的成员（明确排除已请假的成员）
      const activeMembers = formattedMembers.filter(member => 
        member.status === MemberStatus.NORMAL
      );
      
      console.log('状态正常的成员数量:', activeMembers.length);
      
      if (activeMembers.length === 0) {
        // 如果没有状态正常的成员，显示空列表并提示
        console.log('没有可申请请假的成员');
        setMembers([]);
        
        // 显示警告消息
        message.warning('未找到状态正常的成员，请联系管理员');
      } else {
        setMembers(activeMembers);
      }
    } catch (error) {
      console.error('获取成员列表失败:', error);
      message.error('获取成员列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 日期范围选择器的disabledDate配置
  const disabledDate: RangePickerProps['disabledDate'] = (current) => {
    // 不能选择过去的日期，但如果允许选择过去日期，则返回false不做限制
    if (allowPastDates) return false;
    return current && current < dayjs().startOf('day');
  };

  // 提交表单
  const onFinish = async (values: any) => {
    try {
      setSubmitLoading(true);
      
      // 查找选择的成员信息
      const member = members.find(m => m.id === values.memberId);
      if (!member) {
        message.error('未找到选择的成员信息');
        return;
      }
      
      // 额外检查确保成员不处于请假状态
      if (member.status === MemberStatus.ON_LEAVE) {
        message.error('该成员已处于请假状态，无法再次申请请假');
        return;
      }
      
      // 转换日期范围
      const startDate = values.dateRange[0].toDate();
      const endDate = values.dateRange[1].toDate();
      const days = values.dateRange[1].diff(values.dateRange[0], 'day') + 1;
      
      // 构建请假记录数据，符合LeaveRecord接口
      const leaveData = {
        memberId: values.memberId,
        startDate: startDate,
        endDate: endDate,
        reason: values.reason,
        status: 'active' as const, // 指定字面量类型
        // 附加信息，LeanCloud允许额外字段
        extraData: {
          memberName: member.nickname,
          memberQQ: member.qqNumber,
          days: days,
          type: values.type,
          location: '', // 位置设为空字符串
          approved: false,
          adminRemark: ''
        }
      };
      
      // 保存请假记录
      await leaveService.createLeaveRecord(leaveData);
      
      // 更新成员状态为请假中
      await memberService.updateMember(values.memberId, {
        status: MemberStatus.ON_LEAVE
      });
      
      message.success('请假申请已提交');
      form.resetFields();
    } catch (error) {
      console.error('提交请假申请失败:', error);
      message.error('请假申请提交失败，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ fontSize: 24, marginRight: 8, color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>成员请假申请</Title>
          </div>
          
          <Divider />
          
          <Alert
            message="请假说明"
            description={
              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                <li>请假期间，成员状态将显示为"请假中"</li>
                <li>请假期限不得超过30天，若需延长请重新申请</li>
                <li>紧急情况可联系管理员直接审批</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginBottom: 20 }}
          />
          
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              type: 'personal',
            }}
          >
            <Form.Item
              name="memberId"
              label="请假成员"
              rules={[{ required: true, message: '请选择请假成员' }]}
            >
              <Select 
                placeholder="选择成员" 
                loading={loading}
                showSearch
                optionFilterProp="children"
              >
                {members.map(member => (
                  <Option key={member.id} value={member.id}>
                    {member.nickname} ({member.qqNumber})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="dateRange"
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>请假时间</span>
                  <Tooltip title={allowPastDates ? "允许选择过去日期" : "默认只能选择今天及以后的日期"}>
                    <Space size="small">
                      <small style={{ fontSize: '12px', color: '#666' }}>允许选择过去日期:</small>
                      <Switch 
                        checked={allowPastDates} 
                        onChange={setAllowPastDates} 
                        size="small"
                        checkedChildren={<UnlockOutlined />}
                        unCheckedChildren={<LockOutlined />}
                      />
                    </Space>
                  </Tooltip>
                </div>
              }
              rules={[{ required: true, message: '请选择请假时间范围' }]}
            >
              <RangePicker 
                style={{ width: '100%' }} 
                disabledDate={disabledDate}
                locale={locale}
              />
            </Form.Item>
            
            <Form.Item
              name="type"
              label="请假类型"
              rules={[{ required: true, message: '请选择请假类型' }]}
            >
              <Select placeholder="选择请假类型">
                {leaveTypes.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="reason"
              label="请假原因"
              rules={[{ required: true, message: '请填写请假原因' }]}
            >
              <TextArea 
                rows={4} 
                placeholder="详细描述请假原因" 
                showCount 
                maxLength={200} 
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitLoading}
                icon={<CalendarOutlined />}
                size="large"
              >
                提交申请
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default LeaveApply; 