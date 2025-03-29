// 这个文件包含"记住我"功能的辅助函数

import AV from 'leancloud-storage';

// 存储凭证的键值
export const REMEMBER_ME_KEY = 'remember_me_credentials';
// 会话登录标记
export const SESSION_LOGIN_KEY = 'session_only_login';
// 浏览器会话标记
export const BROWSER_SESSION_KEY = 'browser_session_active';

/**
 * 检查是否是浏览器刚刚打开的新会话
 * 如果是会话登录，但浏览器刚刚打开，则应该清除登录状态
 */
export function checkSessionLogin() {
  // 检查是否是会话登录模式
  const isSessionLogin = localStorage.getItem(SESSION_LOGIN_KEY) === 'true';
  
  // 检查是否有活跃的会话标记（如果没有，说明是浏览器刚刚打开）
  const hasActiveSession = sessionStorage.getItem(BROWSER_SESSION_KEY);
  
  // 如果是会话登录模式且没有活跃的会话标记，则清除用户登录状态
  if (isSessionLogin && !hasActiveSession) {
    console.log('检测到会话登录在浏览器重启后，正在清除登录状态');
    
    // 强制清除LeanCloud存储的用户信息
    try {
      // 先执行登出操作
      AV.User.logOut();
      
      // 清除LeanCloud在localStorage中存储的当前用户信息
      localStorage.removeItem(`AV/${AV.applicationId}/currentUser`);
      
      // 清除会话登录标记
      localStorage.removeItem(SESSION_LOGIN_KEY);
      
      return true; // 返回true表示已执行清除操作
    } catch (error) {
      console.error('清除会话登录状态时出错:', error);
    }
  }
  
  // 设置活跃会话标记
  sessionStorage.setItem(BROWSER_SESSION_KEY, 'true');
  return false; // 返回false表示没有执行清除操作
}

/**
 * 设置用户登录状态为"记住我"模式
 */
export function setRememberMe(username: string, password: string) {
  // 保存凭证到localStorage
  const credentials = {
    username,
    password
  };
  localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(credentials));
  
  // 清除会话登录标记
  localStorage.removeItem(SESSION_LOGIN_KEY);
}

/**
 * 设置用户登录状态为"会话登录"模式
 */
export function setSessionOnlyLogin() {
  // 清除记住我凭证
  localStorage.removeItem(REMEMBER_ME_KEY);
  
  // 设置会话登录标记
  localStorage.setItem(SESSION_LOGIN_KEY, 'true');
  
  // 设置活跃会话标记
  sessionStorage.setItem(BROWSER_SESSION_KEY, 'true');
} 