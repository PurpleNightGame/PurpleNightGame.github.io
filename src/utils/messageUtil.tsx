import { message as antMessage } from 'antd';
import { App } from 'antd';
import { createContext, useContext } from 'react';

// 创建消息上下文
export const MessageContext = createContext<{
  success: (content: string) => void;
  error: (content: string) => void;
  info: (content: string) => void;
  warning: (content: string) => void;
}>({
  success: (content: string) => antMessage.success(content),
  error: (content: string) => antMessage.error(content),
  info: (content: string) => antMessage.info(content),
  warning: (content: string) => antMessage.warning(content),
});

// 消息提供者组件
export const MessageProvider = ({ children }: { children: React.ReactNode }) => {
  const staticMethods = App.useApp();
  
  const messageApi = {
    success: (content: string) => staticMethods.message.success(content),
    error: (content: string) => staticMethods.message.error(content),
    info: (content: string) => staticMethods.message.info(content),
    warning: (content: string) => staticMethods.message.warning(content),
  };

  return (
    <MessageContext.Provider value={messageApi}>
      {children}
    </MessageContext.Provider>
  );
};

// 自定义钩子以在组件中使用消息
export const useMessage = () => {
  return useContext(MessageContext);
};

// 兼容旧版本的静态方法（仅用于逐步迁移，最终应该移除）
export const message = {
  success: (content: string) => {
    console.warn('请使用 useMessage hook 替代静态 message 方法');
    return antMessage.success(content);
  },
  error: (content: string) => {
    console.warn('请使用 useMessage hook 替代静态 message 方法');
    return antMessage.error(content);
  },
  info: (content: string) => {
    console.warn('请使用 useMessage hook 替代静态 message 方法');
    return antMessage.info(content);
  },
  warning: (content: string) => {
    console.warn('请使用 useMessage hook 替代静态 message 方法');
    return antMessage.warning(content);
  },
}; 