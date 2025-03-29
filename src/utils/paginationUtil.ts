// 分页设置工具，用于在localStorage中保存和获取分页设置
// 支持缓存不同页面的分页设置，便于用户下次打开时保持一致

interface PaginationConfig {
  current: number;
  pageSize: number;
}

// 默认分页设置
const DEFAULT_PAGINATION: PaginationConfig = {
  current: 1,
  pageSize: 10
};

/**
 * 根据页面ID获取缓存的分页设置
 * @param pageId - 页面唯一标识
 * @returns 分页配置
 */
export const getPaginationFromCache = (pageId: string): PaginationConfig => {
  try {
    const cached = localStorage.getItem(`pagination_${pageId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('读取分页缓存失败:', error);
  }
  return { ...DEFAULT_PAGINATION };
};

/**
 * 将当前分页设置保存到缓存
 * @param pageId - 页面唯一标识
 * @param config - 分页配置
 */
export const savePaginationToCache = (pageId: string, config: PaginationConfig): void => {
  try {
    localStorage.setItem(`pagination_${pageId}`, JSON.stringify(config));
  } catch (error) {
    console.error('保存分页缓存失败:', error);
  }
};

/**
 * 清除特定页面的分页缓存
 * @param pageId - 页面唯一标识
 */
export const clearPaginationCache = (pageId: string): void => {
  try {
    localStorage.removeItem(`pagination_${pageId}`);
  } catch (error) {
    console.error('清除分页缓存失败:', error);
  }
};

/**
 * 清除所有页面的分页缓存
 */
export const clearAllPaginationCache = (): void => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pagination_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('清除所有分页缓存失败:', error);
  }
};

/**
 * 创建标准化的分页配置对象
 * @param pageId - 页面唯一标识
 * @param total - 数据总数
 * @param onPaginationChange - 分页变化回调函数
 * @returns 分页配置
 */
export const createStandardPagination = (
  pageId: string, 
  total: number, 
  onPaginationChange: (page: number, pageSize: number) => void
) => {
  const cachedPagination = getPaginationFromCache(pageId);
  
  return {
    current: cachedPagination.current,
    pageSize: cachedPagination.pageSize,
    total,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条记录`,
    onChange: (page: number, pageSize?: number) => {
      const newPageSize = pageSize || cachedPagination.pageSize;
      savePaginationToCache(pageId, { current: page, pageSize: newPageSize });
      onPaginationChange(page, newPageSize);
    },
    onShowSizeChange: (_: number, size: number) => {
      savePaginationToCache(pageId, { current: 1, pageSize: size });
      onPaginationChange(1, size);
    },
    style: { marginRight: '20px' }
  };
}; 