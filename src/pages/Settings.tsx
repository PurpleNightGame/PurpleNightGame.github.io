import React, { useEffect, useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Upload,
  Avatar,
  Row,
  Col,
  Typography,
  Divider,
  Space
} from 'antd';
import { userService } from '../utils/leancloud';
import { UploadOutlined, UserOutlined, LockOutlined, MailOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
import AV from 'leancloud-storage';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
  const [passwordForm] = Form.useForm();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    // 获取当前用户头像
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      const avatar = currentUser.get('avatar');
      if (avatar) {
        setAvatarUrl(avatar);
      }
    }
  }, []);

  // 上传前检查文件类型和大小
  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片！');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB！');
    }
    return isJpgOrPng && isLt2M;
  };

  // 自定义上传函数
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    if (!beforeUpload(file)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // 使用LeanCloud SDK上传文件
      const avFile = new AV.File(file.name, file);
      const savedFile = await avFile.save();
      
      // 获取文件URL
      const fileUrl = savedFile.url();
      
      // 保存到用户对象
      const currentUser = userService.getCurrentUser();
      if (currentUser) {
        currentUser.set('avatar', fileUrl);
        await currentUser.save();
        setAvatarUrl(fileUrl);
        message.success('头像更新成功！');
        
        // 触发自定义事件，通知导航栏更新头像
        const avatarEvent = new CustomEvent('avatarUpdated', {
          detail: { avatarUrl: fileUrl }
        });
        window.dispatchEvent(avatarEvent);
      }
      
      onSuccess({ url: fileUrl }, file);
    } catch (error) {
      console.error('上传头像失败:', error);
      if (error instanceof Error) {
        message.error(`头像上传失败: ${error.message}`);
      } else {
        message.error('头像上传失败，请稍后重试');
      }
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  // 处理密码修改
  const handlePasswordChange = async (values: { oldPassword: string; newPassword: string }) => {
    if (values.oldPassword === values.newPassword) {
      message.error('新密码不能与旧密码相同');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await userService.updatePassword(values.oldPassword, values.newPassword);
      message.success('密码修改成功');
      passwordForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(`密码修改失败: ${error.message}`);
      } else {
        message.error('密码修改失败，请稍后重试');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // 上传组件的配置
  const uploadProps: UploadProps = {
    name: 'file',
    showUploadList: false,
    customRequest: customUpload
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>个人设置</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title="个人头像" bordered={false}>
            <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
              <Avatar
                size={120}
                icon={<UserOutlined />}
                src={avatarUrl}
                style={{ marginBottom: '20px' }}
              />
              <Upload {...uploadProps}>
                <Button icon={loading ? <LoadingOutlined /> : <UploadOutlined />} disabled={loading}>
                  {loading ? '上传中...' : '上传头像'}
                </Button>
              </Upload>
              <Text type="secondary">支持JPG、PNG格式，文件小于2MB</Text>
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="修改密码" bordered={false}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="oldPassword"
                label="当前密码"
                rules={[
                  { required: true, message: '请输入当前密码' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于6个字符' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={passwordLoading}>
                  修改密码
                </Button>
              </Form.Item>
              
              <Text type="secondary">
                系统将在密码修改成功后自动为您重新登录。
              </Text>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings; 