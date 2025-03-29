import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Button, Statistic, Space, Spin, Badge } from 'antd';
import { 
  TeamOutlined, 
  CalendarOutlined, 
  TrophyOutlined, 
  ExceptionOutlined,
  ClockCircleOutlined,
  FireOutlined,
  CheckCircleOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import { dashboardService } from '../utils/dashboardService';
import { userService } from '../utils/leancloud';

const { Title, Paragraph } = Typography;

// 功能卡片组件
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  path: string;
  badge?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color, path, badge }) => {
  const navigate = useNavigate();
  
  return (
    <Badge count={badge} offset={[-8, 8]} overflowCount={99} style={{ backgroundColor: color }}>
      <Card 
        className="modern-card feature-card"
        hoverable
        onClick={() => navigate(path)}
        style={{ height: '100%' }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start',
          height: '100%'
        }}>
          <div 
            style={{ 
              background: `${color}20`, 
              color: color, 
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '24px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </div>
          <Title level={4} style={{ margin: '0 0 8px 0', color: '#333' }}>{title}</Title>
          <Paragraph style={{ color: 'rgba(0, 0, 0, 0.45)', flexGrow: 1 }}>{description}</Paragraph>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <Button 
              type="text" 
              style={{ 
                color, 
                fontSize: '14px',
                padding: '4px 12px',
                borderRadius: '4px',
                transition: 'all 0.3s'
              }}
              className="use-button"
            >
              开始使用 →
            </Button>
          </div>
        </div>
      </Card>
    </Badge>
  );
};

// 统计卡片组件
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
  loading?: boolean;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, loading = false, suffix }) => {
  return (
    <Card className="modern-card stat-card">
      <Statistic 
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'rgba(0, 0, 0, 0.45)',
            fontSize: '14px'
          }}>
            <span style={{ color, fontSize: '16px' }}>{icon}</span>
            {title}
          </div>
        }
        value={value}
        valueStyle={{ color: '#333', fontWeight: 600 }}
        suffix={suffix}
        loading={loading}
      />
    </Card>
  );
};

const WelcomePage: React.FC = () => {
  const [stats, setStats] = useState({
    memberCount: 0,
    activeMemberCount: 0,
    trainedMemberCount: 0,
    onLeaveMemberCount: 0,
    currentMonthExamCount: 0,
    currentMonthBlackpointCount: 0,
    totalExamCount: 0,
    totalBlackpointCount: 0,
    activeLeaveCount: 0,
    pendingQuitRequestCount: 0,
    pendingStayRequestCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('管理员');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // 获取当前用户
  useEffect(() => {
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      setUsername(currentUser.getUsername());
    }
  }, []);
  
  // 获取统计数据
  useEffect(() => {
    const fetchData = async (forceRefresh = false) => {
      try {
        setLoading(true);
        const data = await dashboardService.getAllStats(forceRefresh);
        setStats(data);
        setRetryCount(0); // 成功后重置重试计数
      } catch (error) {
        console.error('获取Dashboard数据失败:', error);
        
        // 错误重试逻辑
        if (retryCount < MAX_RETRIES) {
          console.log(`请求失败，${retryCount + 1}秒后重试...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchData(false); // 重试时不强制刷新，可能使用缓存
          }, (retryCount + 1) * 1000); // 指数退避，每次失败后等待时间更长
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // 设置定时器，每15分钟刷新一次数据
    const interval = setInterval(() => fetchData(true), 15 * 60 * 1000);
    
    return () => clearInterval(interval); // 组件卸载时清除定时器
  }, [retryCount]);
  
  const currentTime = new Date();
  const hours = currentTime.getHours();
  
  let greeting;
  
  if (hours < 12) {
    greeting = '早上好';
  } else if (hours < 18) {
    greeting = '下午好';
  } else {
    greeting = '晚上好';
  }
  
  // 功能导航卡片数据
  const features = [
    {
      icon: <TeamOutlined />,
      title: '成员管理',
      description: '管理公会所有成员信息，包括成员基本资料、新训状态和黑点记录。',
      color: '#722ED1',
      path: '/members/list'
    },
    {
      icon: <CalendarOutlined />,
      title: '新训管理',
      description: '跟踪记录成员新训情况，管理未训名单，提醒新成员参与新训。',
      color: '#13C2C2',
      path: '/training/untrained'
    },
    {
      icon: <TrophyOutlined />,
      title: '考核管理',
      description: '记录成员月度考核情况，帮助管理者跟踪成员表现和活跃度。',
      color: '#FA8C16',
      path: '/exam/list'
    },
    {
      icon: <ExceptionOutlined />,
      title: '黑点管理',
      description: '登记和查询成员黑点记录，便于管理者做出相应决策。',
      color: '#F5222D',
      path: '/blackpoint/list',
      badge: stats.totalBlackpointCount
    },
    {
      icon: <ClockCircleOutlined />,
      title: '请假管理',
      description: '管理成员请假申请，查看请假记录，便于安排公会活动。',
      color: '#1890FF',
      path: '/leave/list',
      badge: stats.activeLeaveCount
    },
    {
      icon: <LogoutOutlined />,
      title: '退队管理',
      description: '处理成员退队申请，确保公会人员变动得到妥善处理。',
      color: '#EB2F96',
      path: '/quit/approval',
      badge: stats.pendingQuitRequestCount
    }
  ];

  return (
    <div className="welcome-page">
      <div className="welcome-header">
        <Title level={2} className="welcome-greeting">{greeting}，{username}</Title>
        <Paragraph className="welcome-subtitle">
          欢迎使用紫夜公会管理系统，您可以在这里管理公会的各项事务。
        </Paragraph>
      </div>
      
      <div className="stats-section">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<TeamOutlined />} 
              title="成员总数" 
              value={stats.memberCount} 
              color="#722ED1" 
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<CheckCircleOutlined />} 
              title="活跃成员" 
              value={stats.activeMemberCount} 
              color="#52C41A" 
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<CalendarOutlined />} 
              title="已训人数" 
              value={stats.trainedMemberCount} 
              color="#13C2C2" 
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<ClockCircleOutlined />} 
              title="请假成员" 
              value={stats.onLeaveMemberCount} 
              color="#1890FF" 
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<TrophyOutlined />} 
              title="考核总数" 
              value={stats.totalExamCount} 
              color="#FA8C16" 
              loading={loading}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6} xl={4}>
            <StatCard 
              icon={<ExceptionOutlined />} 
              title="黑点总数" 
              value={stats.totalBlackpointCount} 
              color="#F5222D" 
              loading={loading}
            />
          </Col>
        </Row>
      </div>
      
      <div className="divider">
        <span>功能导航</span>
      </div>
      
      <div className="features-section" style={{ background: 'transparent' }}>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} md={8} key={index}>
              <FeatureCard {...feature} />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default WelcomePage; 