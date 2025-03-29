import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  Typography,
  Space,
  Divider,
  Alert,
  Switch,
  Tooltip,
  App
} from 'antd';
import { 
  UserAddOutlined, 
  QuestionCircleOutlined, 
  InfoCircleOutlined 
} from '@ant-design/icons';
import { MemberStage, MemberStatus } from '../types/member';
import { memberService } from '../utils/leancloud';
import AV from 'leancloud-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

// 从localStorage读取被拒绝退队的成员信息的接口
interface RejectedMemberInfo {
  nickname: string;
  qqNumber: string;
  joinDate: string | Date;
}

const MemberAdd: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateCheck, setDuplicateCheck] = useState(true);
  const navigate = useNavigate();
  const { message } = App.useApp(); // 使用上下文中的message

  // 组件加载时检查是否有被拒绝退队的成员信息
  useEffect(() => {
    const rejectedMemberInfoStr = localStorage.getItem('rejectedMemberInfo');
    if (rejectedMemberInfoStr) {
      try {
        const memberInfo: RejectedMemberInfo = JSON.parse(rejectedMemberInfoStr);
        
        // 预填表单数据
        form.setFieldsValue({
          nickname: memberInfo.nickname,
          qqNumber: memberInfo.qqNumber,
          joinDate: dayjs(memberInfo.joinDate)
        });
        
        // 关闭QQ号重复检查，因为这是我们要重新添加的成员
        setDuplicateCheck(false);
        
        // 显示提示信息
        message.info(`正在重新添加被拒绝退队的成员: ${memberInfo.nickname}`);
        
        // 使用后清除存储的信息，避免下次进入页面时仍然预填
        localStorage.removeItem('rejectedMemberInfo');
      } catch (error) {
        console.error('解析被拒绝成员信息失败:', error);
        // 清除可能损坏的数据
        localStorage.removeItem('rejectedMemberInfo');
      }
    }
  }, [form, message]);

  // 处理新训日期变化
  const handleLastTrainingDateChange = (date: dayjs.Dayjs | null) => {
    // 如果选择了日期，并且当前阶段是"未新训"，则自动更新为"新训初期"
    const currentStage = form.getFieldValue('stage');
    if (date && currentStage === MemberStage.NO_TRAINING) {
      form.setFieldsValue({ stage: MemberStage.NEW_TRAINING_INITIAL });
      message.info('由于设置了最后新训日期，阶段已自动更新为"新训初期"');
    }
  };

  // 处理阶段变化
  const handleStageChange = (value: MemberStage) => {
    // 如果选择了"未新训"阶段，但已有新训日期，则不允许选择
    const lastTrainingDate = form.getFieldValue('lastTrainingDate');
    if (value === MemberStage.NO_TRAINING && lastTrainingDate) {
      message.warning('已有新训记录的成员不能设置为"未新训"阶段');
      // 回退到之前的阶段选择
      form.setFieldsValue({ stage: MemberStage.NEW_TRAINING_INITIAL });
    }
  };

  // 检查QQ号是否已存在
  const checkQQNumberExists = async (qqNumber: string) => {
    try {
      // 先检查Member类是否存在
      try {
        const query = new AV.Query('Member');
        query.equalTo('qqNumber', qqNumber);
        const count = await query.count();
        return count > 0;
      } catch (error: any) {
        // 如果是404错误（类不存在），则返回false
        if (error.code === 101 || error.message.includes("Class or object doesn't exists")) {
          console.log('Member类不存在，这可能是首次添加成员');
          return false;
        }
        throw error; // 其他错误则抛出
      }
    } catch (error) {
      console.error('检查QQ号失败:', error);
      // 出错时也返回false，允许用户继续添加，但会记录错误
      return false;
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);
    setFormError(null);
    
    try {
      // 检查QQ号是否重复
      if (duplicateCheck) {
        const exists = await checkQQNumberExists(values.qqNumber);
        if (exists) {
          setFormError(`QQ号 ${values.qqNumber} 已存在！请检查后重试。`);
          setLoading(false);
          return;
        }
      }

      // 格式化数据
      const memberData = {
        nickname: values.nickname,
        qqNumber: values.qqNumber,
        gameId: values.gameId || '',
        joinDate: values.joinDate.toDate(),
        stage: values.stage || MemberStage.NO_TRAINING,
        status: MemberStatus.NORMAL,
        blackpointCount: 0,
        isTeacher: false,
        remark: values.remark || '',
        lastTrainingDate: values.lastTrainingDate ? values.lastTrainingDate.toDate() : null,
      };

      console.log('添加成员数据:', memberData);

      // 调用LeanCloud API保存数据
      await memberService.addMember(memberData);

      // 显示成功消息并重置表单，准备继续添加
      message.success('成员添加成功！');
      form.resetFields();
      
    } catch (error) {
      console.error('添加成员失败:', error);
      setFormError('添加成员失败，请检查网络连接或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <UserAddOutlined style={{ fontSize: 24, marginRight: 8, color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>添加新成员</Title>
          </div>
          
          <Divider />
          
          {formError && (
            <Alert
              message="错误"
              description={formError}
              type="error"
              showIcon
              closable
              onClose={() => setFormError(null)}
            />
          )}
          
          <Alert
            message="成员信息提示"
            description="添加新成员后，系统会自动将其纳入成员管理。未设置最后新训日期的成员将自动进入未训名单，有3天的新训倒计时。"
            type="info"
            showIcon
          />
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              joinDate: dayjs(),
              stage: MemberStage.NO_TRAINING,
              duplicateCheck: true
            }}
            style={{ maxWidth: 600 }}
          >
            <Form.Item
              label="昵称"
              name="nickname"
              rules={[
                { required: true, message: '请输入成员昵称' },
                { min: 2, message: '昵称至少需要2个字符' },
                { max: 20, message: '昵称最长不超过20个字符' }
              ]}
              tooltip="成员在公会中使用的昵称，将作为主要标识"
            >
              <Input placeholder="请输入成员昵称" />
            </Form.Item>
            
            <Form.Item
              label="QQ号"
              name="qqNumber"
              rules={[
                { required: true, message: '请输入QQ号' },
                { pattern: /^\d{5,11}$/, message: 'QQ号格式不正确，应为5-11位数字' }
              ]}
              tooltip="QQ号是联系成员的主要方式，请确保正确"
            >
              <Input placeholder="请输入QQ号" />
            </Form.Item>
            
            <Form.Item
              label={
                <span>
                  检查QQ号重复
                  <Tooltip title="开启后，系统会检查该QQ号是否已经存在，避免重复添加">
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              name="duplicateCheck"
            >
              <Switch
                checked={duplicateCheck}
                onChange={setDuplicateCheck}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
            </Form.Item>
            
            <Form.Item
              label="游戏ID"
              name="gameId"
              tooltip="游戏中使用的ID，选填项"
            >
              <Input placeholder="请输入游戏ID（选填）" />
            </Form.Item>
            
            <Form.Item
              label="加入时间"
              name="joinDate"
              rules={[{ required: true, message: '请选择加入时间' }]}
              tooltip="成员加入公会的日期"
            >
              <DatePicker 
                locale={locale}
                style={{ width: '100%' }} 
                placeholder="请选择加入时间"
              />
            </Form.Item>
            
            <Form.Item
              label={
                <span>
                  最后新训日期
                  <Tooltip title="成员最近一次参加新训的日期，不填写则表示从未参加过新训">
                    <InfoCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              name="lastTrainingDate"
            >
              <DatePicker 
                locale={locale}
                style={{ width: '100%' }} 
                placeholder="请选择最后新训日期（选填）"
                onChange={handleLastTrainingDateChange}
              />
            </Form.Item>
            
            <Form.Item
              label="阶段"
              name="stage"
              rules={[{ required: true, message: '请选择成员阶段' }]}
              tooltip="成员当前的培训阶段"
            >
              <Select 
                placeholder="请选择成员阶段"
                onChange={handleStageChange}
              >
                <Option value={MemberStage.NO_TRAINING}>{MemberStage.NO_TRAINING}</Option>
                <Option value={MemberStage.NEW_TRAINING_INITIAL}>{MemberStage.NEW_TRAINING_INITIAL}</Option>
                <Option value={MemberStage.NEW_TRAINING_1}>{MemberStage.NEW_TRAINING_1}</Option>
                <Option value={MemberStage.NEW_TRAINING_2}>{MemberStage.NEW_TRAINING_2}</Option>
                <Option value={MemberStage.NEW_TRAINING_3}>{MemberStage.NEW_TRAINING_3}</Option>
                <Option value={MemberStage.NEW_TRAINING_CANDIDATE}>{MemberStage.NEW_TRAINING_CANDIDATE}</Option>
                {/* 紫夜阶段不能选择，只能通过考核后自动变更 */}
              </Select>
            </Form.Item>
            
            <Form.Item
              label="备注"
              name="remark"
              tooltip="可以添加一些额外的信息"
            >
              <Input.TextArea 
                placeholder="请输入备注信息（选填）"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>
            
            <Form.Item>
              <Space style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  style={{ flex: 1 }}
                >
                  添加成员
                </Button>
                <Button 
                  onClick={() => navigate('/members/list')}
                  style={{ flex: 1 }}
                >
                  返回列表
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default MemberAdd; 