import { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Card, Typography, Checkbox, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../utils/leancloud';
import AV from 'leancloud-storage';
import { LoginForm } from '../types';
import { useMessage } from '../utils/messageUtil';
import { 
  checkSessionLogin, 
  setRememberMe, 
  setSessionOnlyLogin, 
  REMEMBER_ME_KEY,
  BROWSER_SESSION_KEY 
} from '../Login';
import './auth.css';

const { Title } = Typography;

// 会话登录标记
const SESSION_LOGIN_KEY = 'session_only_login';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const message = useMessage();

  // 尝试自动登录
  useEffect(() => {
    const tryAutoLogin = async () => {
      // 检查会话登录，如果是浏览器重启且是会话登录，会自动清除登录状态
      const loggedOut = checkSessionLogin();
      if (loggedOut) {
        // 如果已清除登录状态，不需要进一步操作
        return;
      }
      
      // 获取当前用户
      const currentUser = userService.getCurrentUser();
      
      // 如果已经登录，直接跳转到仪表盘
      if (currentUser) {
        navigate('/dashboard');
        return;
      }
      
      // 尝试从localStorage获取保存的凭证
      const savedCredentials = localStorage.getItem(REMEMBER_ME_KEY);
      if (savedCredentials) {
        try {
          const { username, password } = JSON.parse(savedCredentials);
          if (username && password) {
            setLoading(true);
            formRef.current?.setFieldsValue({ username, password, remember: true });
            await userService.login(username, password);
            navigate('/dashboard');
          }
        } catch (error) {
          // 自动登录失败，清除保存的凭证
          localStorage.removeItem(REMEMBER_ME_KEY);
          console.error('自动登录失败', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    tryAutoLogin();
  }, [navigate]);

  // 添加粒子效果
  useEffect(() => {
    const createParticles = () => {
      const container = document.querySelector('.auth-container');
      if (!container) return;
      
      // 清除已有粒子
      const existingParticles = document.querySelectorAll('.particle');
      existingParticles.forEach(particle => particle.remove());
      
      const particleCount = 40;
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // 随机位置
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // 随机大小
        const size = Math.random() * 6 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // 随机透明度
        particle.style.opacity = `${Math.random() * 0.5 + 0.3}`;
        
        // 随机动画延迟
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 8}s`;
        
        container.appendChild(particle);
      }
    };
    
    createParticles();
    
    // 清理函数
    return () => {
      const particles = document.querySelectorAll('.particle');
      particles.forEach(particle => particle.remove());
    };
  }, []);

  // 添加抖动动画效果
  const applyShakeAnimation = () => {
    if (cardRef.current) {
      cardRef.current.classList.add('auth-card-shake');
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.classList.remove('auth-card-shake');
        }
      }, 500);
    }
  };

  // 解析错误消息
  const parseErrorMessage = (error: any): string => {
    const message = error.message || '';
    
    if (message.includes('username and password')) {
      return '用户名或密码错误，请重新输入';
    } else if (message.includes('network')) {
      return '网络连接异常，请检查网络后重试';
    } else if (message.toLowerCase().includes('not found')) {
      return '该用户不存在，请联系系统管理员';
    } else if (message.toLowerCase().includes('locked')) {
      return '账号已被锁定，请联系系统管理员';
    } else {
      return '登录失败，请稍后再试';
    }
  };

  const onFinish = async (values: LoginForm) => {
    try {
      setErrorMsg(null);
      setLoading(true);
      
      // 登录用户
      await userService.login(values.username, values.password);
      
      // 根据"记住我"选项，设置相应的登录模式
      if (values.remember) {
        // 设置为"记住我"模式
        setRememberMe(values.username, values.password);
      } else {
        // 设置为"会话登录"模式
        setSessionOnlyLogin();
      }
      
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = parseErrorMessage(error);
      setErrorMsg(errorMessage);
      applyShakeAnimation();
      formRef.current?.validateFields(['username', 'password'])
        .catch(() => {/* 忽略验证错误 */});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* 半透明遮罩 */}
      <div className="auth-overlay" />
      
      <Card className="auth-card" ref={cardRef}>
        <div className="auth-logo">
          <img src="https://s21.ax1x.com/2024/12/08/pA72i5R.png" alt="紫夜公会管理系统" />
        </div>
        
        <div className="auth-title">
          <Title level={2}>紫夜公会管理系统</Title>
          <Title level={4}>欢迎回来，请登录您的账号</Title>
        </div>
        
        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          initialValues={{ remember: true }}
          ref={formRef}
        >
          {errorMsg && (
            <Form.Item>
              <Alert
                message={errorMsg}
                type="error"
                showIcon
                className="auth-error"
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
            validateStatus={errorMsg ? 'error' : undefined}
          >
            <Input 
              prefix={<UserOutlined className="auth-prefix-icon" />} 
              placeholder="用户名" 
              className="auth-input"
              onFocus={() => setErrorMsg(null)}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
            validateStatus={errorMsg ? 'error' : undefined}
          >
            <Input.Password 
              prefix={<LockOutlined className="auth-prefix-icon" />} 
              placeholder="密码" 
              className="auth-input"
              onFocus={() => setErrorMsg(null)}
            />
          </Form.Item>

          <div className="auth-form-footer">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住我</Checkbox>
            </Form.Item>
          </div>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              className="auth-button"
            >
              登录
            </Button>
          </Form.Item>

          <div className="auth-link">
            <span>管理员账号由系统管理员创建，不支持自主注册</span>
          </div>
        </Form>
        
        <div className="auth-copyright">
          <span>© {new Date().getFullYear()} 紫夜公会管理系统 - 版权所有</span>
        </div>
      </Card>
    </div>
  );
};

export default Login;