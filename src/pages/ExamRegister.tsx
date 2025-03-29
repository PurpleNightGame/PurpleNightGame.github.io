import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  message, 
  Typography,
  Space,
  Divider,
  InputNumber,
  Rate
} from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { Member, MemberStage, MemberStatus, ExamStatus } from '../types/member';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { memberService, examService } from '../utils/leancloud';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

const ExamRegister: React.FC = () => {
  const [form] = Form.useForm();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examStatus, setExamStatus] = useState<ExamStatus>(ExamStatus.IN_PROGRESS);
  const [isCustomMap, setIsCustomMap] = useState(false);

  // 获取所有成员
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const result = await memberService.getAllMembers();
      
      // 将LeanCloud对象转换为成员对象
      const formattedMembers: Member[] = result.map((item: any) => ({
        id: item.id,
        nickname: item.get('nickname'),
        qqNumber: item.get('qqNumber'),
        gameId: item.get('gameId') || '',
        joinDate: item.get('joinDate'),
        stage: item.get('stage'),
        status: item.get('status'),
        lastTrainingDate: item.get('lastTrainingDate'),
        blackpointCount: item.get('blackpointCount') || 0,
        isTeacher: item.get('isTeacher') || false,
        remark: item.get('remark') || '',
      }));
      
      // 获取非退队状态且不是紫夜阶段的成员（包括正常和请假状态）
      const eligibleMembers = formattedMembers.filter(member => 
        (member.status === MemberStatus.NORMAL || member.status === MemberStatus.ON_LEAVE) && 
        member.stage !== MemberStage.PURPLE_NIGHT
      );
      
      setMembers(eligibleMembers);
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

  // 处理考核状态变化
  const handleStatusChange = (value: ExamStatus) => {
    setExamStatus(value);
    // 如果状态改为"通过"，默认设置通过日期为今天
    if (value === ExamStatus.PASSED) {
      form.setFieldValue('passDate', dayjs());
    } else {
      form.setFieldValue('passDate', undefined);
    }
  };
  
  // 处理地图选择变化
  const handleMapChange = (value: string) => {
    setIsCustomMap(value === '自定义');
    // 清空自定义地图名称
    if (value !== '自定义') {
      form.setFieldValue('customMapName', undefined);
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 获取成员名称
      const member = members.find(m => m.id === values.memberId);
      if (!member) {
        message.error('无法找到选中的成员');
        setSubmitting(false);
        return;
      }
      
      // 处理自定义地图名称
      let finalMapName = values.mapName;
      if (values.mapName === '自定义' && values.customMapName) {
        finalMapName = values.customMapName;
      }
      
      // 格式化数据
      const examData = {
        ...values,
        memberName: member.nickname,
        mapName: finalMapName,
        passDate: values.passDate ? values.passDate.toDate() : null,
      };

      // 保存考核记录
      await examService.createExam(examData);
      
      // 如果考核通过，更新成员阶段为紫夜，但保持原有状态不变
      if (examData.status === ExamStatus.PASSED) {
        await memberService.updateMember(member.id, {
          stage: MemberStage.PURPLE_NIGHT
          // 不更新status字段，保持原有状态
        });
        
        const statusText = member.status === MemberStatus.ON_LEAVE ? "（保持请假状态）" : "";
        message.success(`成员 ${member.nickname} 考核通过，阶段已更新为紫夜${statusText}`);
      }

      message.success('考核记录已保存！');
      form.resetFields();
      setExamStatus(ExamStatus.IN_PROGRESS);
      setIsCustomMap(false);
    } catch (error) {
      console.error('保存考核记录失败:', error);
      message.error('保存考核记录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TrophyOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>登记考核</Title>
          </div>
          
          <Divider />
          
          <div style={{ backgroundColor: '#f9f0ff', padding: 16, borderRadius: 8, border: '1px solid #efdbff' }}>
            <Space direction="vertical" size="small">
              <Text strong>考核说明</Text>
              <Text type="secondary">
                1. 选择成员和考核地图，填写考核结果。
                <br />
                2. 考核通过后，系统将自动将成员阶段更新为"紫夜"。
                <br />
                3. 考核通过一个月后，成员将自动获得教授尖兵课程的权限。
              </Text>
            </Space>
          </div>
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              status: ExamStatus.IN_PROGRESS,
            }}
            style={{ maxWidth: 600 }}
          >
            <Form.Item
              label="选择成员"
              name="memberId"
              rules={[{ required: true, message: '请选择考核成员' }]}
            >
              <Select 
                placeholder="请选择考核成员" 
                loading={loading}
                showSearch
                optionFilterProp="children"
              >
                {members.map(member => (
                  <Option key={member.id} value={member.id}>
                    {member.nickname} ({member.stage}) {member.status === MemberStatus.ON_LEAVE ? '(请假中)' : ''}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="考核地图"
              name="mapName"
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
                label="自定义地图名称"
                name="customMapName"
                rules={[{ required: true, message: '请输入自定义地图名称' }]}
              >
                <Input placeholder="请输入自定义地图名称" />
              </Form.Item>
            )}
            
            <Form.Item
              label="考核状态"
              name="status"
              rules={[{ required: true, message: '请选择考核状态' }]}
            >
              <Select 
                placeholder="请选择考核状态"
                onChange={handleStatusChange}
              >
                <Option value={ExamStatus.IN_PROGRESS}>{ExamStatus.IN_PROGRESS}</Option>
                <Option value={ExamStatus.PASSED}>{ExamStatus.PASSED}</Option>
                <Option value={ExamStatus.FAILED}>{ExamStatus.FAILED}</Option>
              </Select>
            </Form.Item>
            
            {examStatus === ExamStatus.PASSED && (
              <>
                <Form.Item
                  label="通过日期"
                  name="passDate"
                  rules={[{ required: true, message: '请选择通过日期' }]}
                >
                  <DatePicker 
                    locale={locale}
                    style={{ width: '100%' }} 
                    placeholder="请选择通过日期"
                  />
                </Form.Item>
                
                <Form.Item
                  label="考核评分"
                  name="score"
                  rules={[{ required: true, message: '请输入考核评分' }]}
                >
                  <InputNumber 
                    min={0} 
                    max={100} 
                    placeholder="请输入0-100之间的分数" 
                    style={{ width: '100%' }}
                    addonAfter="分"
                  />
                </Form.Item>
              </>
            )}
            
            <Form.Item
              label="考核评价"
              name="comment"
            >
              <TextArea 
                rows={4} 
                placeholder="请输入考核评价（选填）"
                maxLength={200}
                showCount
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                style={{ width: '100%' }}
              >
                保存考核记录
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default ExamRegister;