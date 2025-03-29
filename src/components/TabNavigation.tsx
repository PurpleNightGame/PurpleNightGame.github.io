import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ExceptionOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import './TabNavigation.css';

export interface TabItem {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  closable: boolean;
  id?: string; // 添加唯一标识
}

// 路径到标签信息的映射
const pathToTabInfo: Record<string, Omit<TabItem, 'key' | 'closable' | 'id'>> = {
  '/dashboard': { label: '首页', path: '/dashboard', icon: <HomeOutlined /> },
  '/settings': { label: '系统设置', path: '/settings', icon: <SettingOutlined /> },
  '/members/list': { label: '成员列表', path: '/members/list', icon: <TeamOutlined /> },
  '/members/add': { label: '添加成员', path: '/members/add', icon: <TeamOutlined /> },
  '/training/update': { label: '更新新训日期', path: '/training/update', icon: <CalendarOutlined /> },
  '/training/untrained': { label: '未训名单', path: '/training/untrained', icon: <CalendarOutlined /> },
  '/training/reminder': { label: '催促名单', path: '/training/reminder', icon: <CalendarOutlined /> },
  '/exam/register': { label: '登记考核', path: '/exam/register', icon: <TrophyOutlined /> },
  '/exam/list': { label: '考核记录', path: '/exam/list', icon: <TrophyOutlined /> },
  '/blackpoint/register': { label: '登记黑点', path: '/blackpoint/register', icon: <ExceptionOutlined /> },
  '/blackpoint/list': { label: '黑点记录', path: '/blackpoint/list', icon: <ExceptionOutlined /> },
  '/leave/apply': { label: '登记请假', path: '/leave/apply', icon: <ClockCircleOutlined /> },
  '/leave/list': { label: '请假记录', path: '/leave/list', icon: <ClockCircleOutlined /> },
  '/quit/approval': { label: '退队审批', path: '/quit/approval', icon: <LogoutOutlined /> },
};

// 为了在刷新后保持状态，我们添加本地存储功能
const STORAGE_KEY = 'purple_night_tabs';

// 本地存储接口，不包含图标，因为图标不能序列化
interface StoredTabItem {
  key: string;
  label: string;
  path: string;
  closable: boolean;
  id?: string; // 添加ID字段
}

// 使用memo包装自定义标签渲染器
const TabLabel = React.memo(({ tab }: { tab: TabItem }) => {
  // 不同类型标签页的颜色
  const getCategoryColor = (path: string) => {
    if (path === '/dashboard') return '#722ed1'; // 首页紫色
    if (path.startsWith('/members')) return '#1890ff'; // 成员管理蓝色
    if (path.startsWith('/training')) return '#52c41a'; // 新训管理绿色
    if (path.startsWith('/exam')) return '#faad14'; // 考核管理黄色
    if (path.startsWith('/blackpoint')) return '#ff4d4f'; // 黑点管理红色
    if (path.startsWith('/leave')) return '#13c2c2'; // 请假管理青色
    if (path.startsWith('/quit')) return '#eb2f96'; // 退队管理粉色
    if (path === '/settings') return '#fa8c16'; // 系统设置橙色
    return '#722ed1'; // 默认紫色
  };
  
  const color = getCategoryColor(tab.path);
  
  return (
    <Tooltip title={tab.label}>
      <span className="tab-label-wrapper">
        <span className="tab-dot" style={{ backgroundColor: color }}></span>
        {tab.icon && <span className="tab-icon">{tab.icon}</span>}
        {tab.label}
      </span>
    </Tooltip>
  );
});

interface TabNavigationProps {
  defaultTabs?: TabItem[];
}

const TabNavigation: React.FC<TabNavigationProps> = ({ defaultTabs = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeKey, setActiveKey] = useState<string>('');
  
  // 从本地存储加载初始标签
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    try {
      const storedTabs = localStorage.getItem(STORAGE_KEY);
      if (!storedTabs) {
        // 如果没有存储的标签，返回默认的首页标签
        return [{
          key: '/dashboard',
          label: '首页',
          path: '/dashboard',
          icon: <HomeOutlined />,
          closable: false,
          id: 'home'
        }];
      }
      
      const parsedTabs: StoredTabItem[] = JSON.parse(storedTabs);
      
      // 去除重复路径的标签，使用Set简化操作
      const uniquePaths = new Set<string>();
      const uniqueTabs: TabItem[] = [];
      
      // 只保留不重复的标签
      for (const tab of parsedTabs) {
        if (!uniquePaths.has(tab.path)) {
          uniquePaths.add(tab.path);
          uniqueTabs.push({
            ...tab,
            icon: pathToTabInfo[tab.path]?.icon
          });
        }
      }
      
      // 确保至少有首页标签
      if (uniqueTabs.length === 0) {
        uniqueTabs.push({
          key: '/dashboard',
          label: '首页',
          path: '/dashboard',
          icon: <HomeOutlined />,
          closable: false,
          id: 'home'
        });
      }
      
      return uniqueTabs;
    } catch (error) {
      console.error('加载标签失败:', error);
      // 出错时返回默认的首页标签
      return [{
        key: '/dashboard',
        label: '首页',
        path: '/dashboard',
        icon: <HomeOutlined />,
        closable: false,
        id: 'home'
      }];
    }
  });

  // 当标签列表变化时保存到本地存储，使用useCallback包装
  const saveTabs = useCallback(() => {
    if (tabs.length > 0) {
      try {
        // 移除不能序列化的图标属性
        const storableTabs: StoredTabItem[] = tabs.map(tab => ({
          key: tab.key,
          label: tab.label,
          path: tab.path,
          closable: tab.closable,
          id: tab.id
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storableTabs));
      } catch (error) {
        console.error('保存标签失败:', error);
      }
    }
  }, [tabs]);

  useEffect(() => {
    saveTabs();
  }, [saveTabs]);

  // 生成唯一ID，使用useCallback包装
  const generateId = useCallback(() => {
    return Math.random().toString(36).substring(2, 10);
  }, []);

  // 当路由变化时更新标签
  useEffect(() => {
    const currentPath = location.pathname;
    const tabInfo = pathToTabInfo[currentPath];

    if (!tabInfo) return;

    // 先设置当前活动标签，必要时才设置以避免不必要的渲染
    if (activeKey !== currentPath) {
      setActiveKey(currentPath);
    }

    // 检查是否已存在相同路径的标签，使用函数引用检查以减少重渲染
    setTabs(prevTabs => {
      // 如果已经存在，直接返回同一数组引用，不触发重新渲染
      const existingTab = prevTabs.find(tab => tab.path === currentPath);
      if (existingTab) {
        return prevTabs;
      }
      
      // 否则添加新标签
      const newTab: TabItem = {
        key: currentPath,
        label: tabInfo.label,
        path: currentPath,
        icon: tabInfo.icon,
        closable: currentPath !== '/dashboard', // 首页不允许关闭
        id: generateId(), // 添加唯一ID
      };
      
      // 添加新标签
      return [...prevTabs, newTab];
    });
  }, [location.pathname, generateId, activeKey]);

  // 处理标签切换，使用useCallback包装
  const handleTabChange = useCallback((activeKey: string) => {
    navigate(activeKey);
    setActiveKey(activeKey);
  }, [navigate]);

  // 处理标签关闭，使用useCallback包装
  const handleTabEdit = useCallback((targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
    if (action === 'remove' && typeof targetKey === 'string') {
      // 先移除标签
      setTabs(prevTabs => {
        const targetIndex = prevTabs.findIndex(tab => tab.path === targetKey);
        if (targetIndex === -1) return prevTabs; // 如果找不到标签，不做任何操作
        
        const newTabs = [...prevTabs];
        newTabs.splice(targetIndex, 1); // 移除标签
        
        // 如果关闭的是当前活动标签，且有其他标签，则决定新的活动标签
        if (targetKey === activeKey && newTabs.length > 0) {
          // 优先选择关闭标签右侧的标签，如果没有则选择左侧的
          const newActiveIndex = targetIndex >= newTabs.length ? targetIndex - 1 : targetIndex;
          const newActiveKey = newTabs[newActiveIndex]?.path || '/dashboard';
          
          // 使用setTimeout延迟导航，确保标签先被移除
          setTimeout(() => {
            navigate(newActiveKey);
          }, 0);
        } else if (newTabs.length === 0) {
          // 如果没有标签了，添加首页标签并导航到首页
          newTabs.push({
            key: '/dashboard',
            label: '首页',
            path: '/dashboard',
            icon: <HomeOutlined />,
            closable: false,
            id: 'home'
          });
          
          // 使用setTimeout延迟导航，确保状态更新完成
          setTimeout(() => {
            navigate('/dashboard');
          }, 0);
        }
        
        return newTabs;
      });
    }
  }, [activeKey, navigate]);

  // 使用useMemo缓存tab items，避免重新渲染
  const tabItems = useMemo(() => {
    return tabs.map(tab => ({
      key: tab.path,
      label: <TabLabel tab={tab} />,
      closable: tab.closable,
    }));
  }, [tabs]);

  return (
    <Tabs
      className="custom-tabs"
      activeKey={activeKey}
      type="editable-card"
      hideAdd
      onChange={handleTabChange}
      onEdit={handleTabEdit}
      items={tabItems}
      tabBarStyle={{ background: '#fff', margin: 0, padding: '8px 16px 0' }}
    />
  );
};

export default React.memo(TabNavigation); 