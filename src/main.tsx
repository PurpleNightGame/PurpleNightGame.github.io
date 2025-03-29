import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import './index.css';
import App from './App.tsx';
import { initLeanCloud } from './utils/leancloud';
import { MessageProvider } from './utils/messageUtil';

// 初始化LeanCloud
try {
  console.log('正在初始化LeanCloud...');
  initLeanCloud();
  console.log('LeanCloud初始化成功');
} catch (error) {
  console.error('LeanCloud初始化失败:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/">
      <AntdApp>
        <MessageProvider>
          <App />
        </MessageProvider>
      </AntdApp>
    </BrowserRouter>
  </StrictMode>,
);
