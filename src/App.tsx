import { useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { userService } from './utils/leancloud';
import { checkSessionLogin, BROWSER_SESSION_KEY } from './Login';

// 会话登录标记
const SESSION_LOGIN_KEY = 'session_only_login';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const location = useLocation();

  // 应用启动时检查会话登录
  useEffect(() => {
    // 执行会话登录检查，如果是浏览器重启且是会话登录，会自动清除登录状态
    const loggedOut = checkSessionLogin();
    
    // 如果已经清除了登录状态，则设置认证状态为false
    if (loggedOut) {
      setIsAuthenticated(false);
    }
  }, []); // 空依赖数组表示只在组件挂载时执行一次

  // 检查用户是否已登录，这个effect在路由变化时执行
  useEffect(() => {
    const checkAuth = () => {
      // 设置浏览器会话标记
      sessionStorage.setItem(BROWSER_SESSION_KEY, 'true');
      
      // 获取当前用户
      const currentUser = userService.getCurrentUser();
      setIsAuthenticated(!!currentUser);
    };
    
    checkAuth();
  }, [location]);

  // 需要认证的路由
  const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    if (!isAuthenticated && location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#722ed1' } }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* 仪表盘路由 */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 系统设置路由 */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 成员管理路由 */}
        <Route path="/members/list" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/members/add" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 新训管理路由 */}
        <Route path="/training/update" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/training/untrained" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/training/reminder" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 考核管理路由 */}
        <Route path="/exam/register" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/exam/list" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 黑点管理路由 */}
        <Route path="/blackpoint/register" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/blackpoint/list" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 请假管理路由 */}
        <Route path="/leave/apply" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/leave/list" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* 退队管理路由 */}
        <Route path="/quit/approval" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ConfigProvider>
  );
};

export default App;
