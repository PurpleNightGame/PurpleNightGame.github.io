import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ExceptionOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import QuitOutlined from '@ant-design/icons/LogoutOutlined';
import { useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../utils/leancloud';
import { dashboardService } from '../utils/dashboardService';
import Settings from './Settings';
import type { MenuProps } from 'antd';
import MemberList from './MemberList';
import MemberAdd from './MemberAdd';
import TrainingUpdate from './TrainingUpdate';
import UntrainedList from './UntrainedList';
import TrainingReminder from './TrainingReminder';
import ExamRegister from './ExamRegister';
import ExamList from './ExamList';
import BlackpointRegister from './BlackpointRegister';
import BlackpointList from './BlackpointList';
import LeaveApply from './LeaveApply';
import LeaveList from './LeaveList';
import QuitApproval from './QuitApproval';
import TabNavigation from '../components/TabNavigation';
import WelcomePage from '../components/WelcomePage';
import '../styles/Dashboard.css'; // 导入样式表
import { REMEMBER_ME_KEY, SESSION_LOGIN_KEY, BROWSER_SESSION_KEY } from '../Login';

const { Header, Sider, Content } = Layout;

// 为缺失的组件创建占位符组件
const PlaceholderComponent = ({ title }: { title: string }) => (
  <div style={{ textAlign: 'center', marginTop: 50 }}>
    <Typography.Title level={3} style={{ color: '#722ed1' }}>{title}</Typography.Title>
    <p>此页面正在开发中，敬请期待</p>
  </div>
);

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 获取当前路径对应的父菜单项
  const getParentKey = (path: string) => {
    if (path.startsWith('/members')) return 'members';
    if (path.startsWith('/training')) return 'training';
    if (path.startsWith('/exam')) return 'exam';
    if (path.startsWith('/blackpoint')) return 'blackpoint';
    if (path.startsWith('/leave')) return 'leave';
    if (path.startsWith('/quit')) return 'quit';
    return '';
  };
  
  const [collapsed, setCollapsed] = useState(false);
  // 不再动态管理openKeys，而是直接从路径计算
  const parentKey = getParentKey(location.pathname);
  const [openKeys, setOpenKeys] = useState<string[]>(parentKey ? [parentKey] : []);
  const [username, setUsername] = useState<string>('管理员');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // 获取当前用户
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      setUsername(currentUser.getUsername());
      const avatar = currentUser.get('avatar');
      if (avatar) {
        setAvatarUrl(avatar);
      }
    }
  }, []);

  // 监听路由变化，在回到dashboard页面时清除缓存以获取最新数据
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      console.log('回到Dashboard页面，清除缓存以获取最新数据');
      dashboardService.clearCache();
    }
  }, [location.pathname]);

  // 添加事件监听器，当用户头像更新时接收通知
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      setAvatarUrl(event.detail.avatarUrl);
    };

    // 监听自定义事件
    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);

    // 组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    // 清除所有登录相关的存储
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(SESSION_LOGIN_KEY);
    sessionStorage.removeItem(BROWSER_SESSION_KEY);
    
    // 执行LeanCloud的登出操作
    await userService.logout();
    
    // 跳转到登录页
    navigate('/login');
  };

  // 路径变化或折叠状态变化时更新openKeys
  useEffect(() => {
    if (collapsed) {
      return; // 折叠时不做任何事
    }
    
    const newParentKey = getParentKey(location.pathname);
    if (newParentKey) {
      // 只有当路径变化时，才设置新的openKeys
      setOpenKeys([newParentKey]);
    }
  }, [location.pathname, collapsed]);

  const getSelectedKey = () => {
    const path = location.pathname;
    
    // 返回子菜单项的key，而不是父菜单项的key
    if (path === '/dashboard') return ['dashboard'];
    if (path === '/settings') return ['settings'];
    
    // 成员管理
    if (path === '/members/list') return ['members.list'];
    if (path === '/members/add') return ['members.add'];
    
    // 新训管理
    if (path === '/training/update') return ['training.update'];
    if (path === '/training/untrained') return ['training.untrained'];
    if (path === '/training/reminder') return ['training.reminder'];
    
    // 考核管理
    if (path === '/exam/register') return ['exam.register'];
    if (path === '/exam/list') return ['exam.list'];
    
    // 黑点管理
    if (path === '/blackpoint/register') return ['blackpoint.register'];
    if (path === '/blackpoint/list') return ['blackpoint.list'];
    
    // 请假管理
    if (path === '/leave/apply') return ['leave.apply'];
    if (path === '/leave/list') return ['leave.list'];
    
    // 退队管理
    if (path === '/quit/approval') return ['quit.approval'];
    
    return ['dashboard'];
  };

  // 处理菜单展开/收起 - 用户手动点击菜单时的处理
  const handleOpenChange = (keys: string[]) => {
    // 保存用户手动展开/收起的状态
    setOpenKeys(keys);
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'members.list':
        navigate('/members/list');
        break;
      case 'members.add':
        navigate('/members/add');
        break;
      case 'training.update':
        navigate('/training/update');
        break;
      case 'training.untrained':
        navigate('/training/untrained');
        break;
      case 'training.reminder':
        navigate('/training/reminder');
        break;
      case 'exam.register':
        navigate('/exam/register');
        break;
      case 'exam.list':
        navigate('/exam/list');
        break;
      case 'blackpoint.register':
        navigate('/blackpoint/register');
        break;
      case 'blackpoint.list':
        navigate('/blackpoint/list');
        break;
      case 'leave.apply':
        navigate('/leave/apply');
        break;
      case 'leave.list':
        navigate('/leave/list');
        break;
      case 'quit.approval':
        navigate('/quit/approval');
        break;
      default:
        break;
    }
  };

  const items = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // 侧边栏菜单项
  const menuItems: MenuItem[] = [
    getItem('首页', 'dashboard', <HomeOutlined />),
    getItem('成员管理', 'members', <TeamOutlined />, [
      getItem('成员列表', 'members.list'),
      getItem('添加成员', 'members.add'),
    ]),
    getItem('新训管理', 'training', <CalendarOutlined />, [
      getItem('更新新训日期', 'training.update'),
      getItem('未训名单', 'training.untrained'),
      getItem('催促名单', 'training.reminder'),
    ]),
    getItem('考核管理', 'exam', <TrophyOutlined />, [
      getItem('登记考核', 'exam.register'),
      getItem('考核记录', 'exam.list'),
    ]),
    getItem('黑点管理', 'blackpoint', <ExceptionOutlined />, [
      getItem('登记黑点', 'blackpoint.register'),
      getItem('黑点记录', 'blackpoint.list'),
    ]),
    getItem('请假管理', 'leave', <ClockCircleOutlined />, [
      getItem('登记请假', 'leave.apply'),
      getItem('请假记录', 'leave.list'),
    ]),
    getItem('退队管理', 'quit', <QuitOutlined />, [
      getItem('退留审批', 'quit.approval'),
    ]),
    getItem('系统设置', 'settings', <SettingOutlined />),
  ];

  // 自定义菜单样式
  const menuStyle = {
    borderRight: 0,
    background: 'transparent',
  };

  // 自定义菜单项样式
  const getItemStyle = (isSelected: boolean) => ({
    margin: '4px 8px',
    borderRadius: '6px',
    backgroundColor: isSelected ? 'rgba(114, 46, 209, 0.2)' : 'transparent',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  });

  // 渲染自定义菜单项，添加选中和悬停效果
  const getStyledMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.map((item) => {
      if (!item) return item;

      // 检查item是否为SubMenuType或MenuItemGroupType类型，它们才有children属性
      const itemWithChildren = item as {
        key?: React.Key;
        children?: MenuItem[];
        style?: React.CSSProperties;
      };

      const selectedKeys = getSelectedKey();
      const isSelected = itemWithChildren.key ? selectedKeys.includes(itemWithChildren.key.toString()) : false;
      
      // 处理子菜单
      if (itemWithChildren.children && itemWithChildren.children.length > 0) {
        return {
          ...item,
          children: getStyledMenuItems(itemWithChildren.children),
          style: {
            ...getItemStyle(false),
            paddingLeft: '4px',
          },
        } as MenuItem;
      }
      
      // 处理普通菜单项
      return {
        ...item,
        style: getItemStyle(isSelected),
      } as MenuItem;
    });
  };

  // 应用样式到菜单项
  const styledMenuItems = getStyledMenuItems(menuItems);

  // 根据当前路径选择要显示的内容
  const renderContent = () => {
    const path = location.pathname;
    
    if (path === '/dashboard') {
      return <WelcomePage />;
    }
    
    if (path === '/settings') {
      return <Settings />;
    }
    
    // 成员管理
    if (path === '/members/list') {
      return <MemberList />;
    }
    
    if (path === '/members/add') {
      return <MemberAdd />;
    }
    
    // 新训管理
    if (path === '/training/update') {
      return <TrainingUpdate />;
    }
    
    if (path === '/training/untrained') {
      return <UntrainedList />;
    }
    
    if (path === '/training/reminder') {
      return <TrainingReminder />;
    }
    
    // 考核管理
    if (path === '/exam/register') {
      return <ExamRegister />;
    }
    
    if (path === '/exam/list') {
      return <ExamList />;
    }
    
    // 黑点管理
    if (path === '/blackpoint/register') {
      return <BlackpointRegister />;
    }
    
    if (path === '/blackpoint/list') {
      return <BlackpointList />;
    }
    
    // 请假管理
    if (path === '/leave/apply') {
      return <LeaveApply />;
    }
    
    if (path === '/leave/list') {
      return <LeaveList />;
    }
    
    // 退队管理
    if (path === '/quit/approval') {
      return <QuitApproval />;
    }
    
    // 如果没有匹配的路由，返回仪表盘
    return (
      <div className="welcome-content">
        <Typography.Title level={2} className="welcome-title">欢迎使用紫夜公会管理系统</Typography.Title>
        <p>请从左侧菜单选择功能</p>
      </div>
    );
  };

  return (
    <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'all 0.3s' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="dark"
        width={220}
        className="dashboard-sider"
      >
        <div className="logo-container">
          <div className="logo-image-container" style={{ 
            width: collapsed ? 48 : 64, 
            height: collapsed ? 48 : 64,
            marginBottom: collapsed ? 0 : 12, 
          }}>
            <img 
              src="https://s21.ax1x.com/2024/12/08/pA72i5R.png" 
              alt="紫夜公会" 
              className="logo-image"
              style={{ 
                width: collapsed ? 44 : 60,
                height: collapsed ? 44 : 60,
              }} 
            />
          </div>
          {!collapsed && (
            <Typography.Title level={5} className="logo-title">
              紫夜公会管理系统
            </Typography.Title>
          )}
        </div>

        <div 
          className="toggle-button" 
          style={{
            right: 0,
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '>' : '<'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={handleOpenChange}
          onClick={handleMenuClick}
          items={styledMenuItems}
          className="custom-menu"
        />
      </Sider>
      <Layout>
        <Header className="dashboard-header">
          <div style={{ paddingLeft: 16 }}>
            {collapsed ? 
              <MenuUnfoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', cursor: 'pointer' }} /> : 
              <MenuFoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', cursor: 'pointer' }} />
            }
          </div>
          <div style={{ paddingRight: 24 }}>
            <Dropdown menu={{ items }} placement="bottomRight">
              <div className="user-dropdown">
                <Avatar 
                  icon={<UserOutlined />} 
                  src={avatarUrl} 
                  size="default"
                  style={{ marginRight: !collapsed ? 8 : 0 }}
                />
                {!collapsed && <span style={{ fontSize: '14px' }}>{username}</span>}
              </div>
            </Dropdown>
          </div>
        </Header>
        
        {/* 添加标签导航 */}
        <div className="tab-navigation-container">
          <TabNavigation />
        </div>
        
        <Content className="dashboard-content">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;