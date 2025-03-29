import React, { useState, useEffect } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd/es/table';
import { getPaginationFromCache, savePaginationToCache } from '../utils/paginationUtil';

interface StandardTableProps<RecordType> extends Omit<TableProps<RecordType>, 'pagination'> {
  pageId: string; // 页面唯一标识符，用于缓存分页设置
  total?: number; // 总记录数，默认使用dataSource.length
  showPagination?: boolean; // 是否显示分页，默认为true
  onPaginationChange?: (page: number, pageSize: number) => void; // 分页变化回调
}

/**
 * 标准表格组件，带有分页缓存功能
 * 会自动将分页设置保存到localStorage，下次打开时恢复
 */
export function StandardTable<RecordType extends object = any>({
  pageId,
  dataSource,
  total,
  showPagination = true,
  onPaginationChange,
  ...restProps
}: StandardTableProps<RecordType>) {
  // 从缓存中获取分页设置
  const [pagination, setPagination] = useState(() => ({
    ...getPaginationFromCache(pageId),
    total: total || (dataSource ? dataSource.length : 0)
  }));

  // 当数据源或总数变化时更新分页总数
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: total || (dataSource ? dataSource.length : 0)
    }));
  }, [dataSource, total]);

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize: number) => {
    const newPagination = {
      ...pagination,
      current: page,
      pageSize: pageSize
    };
    
    setPagination(newPagination);
    
    // 保存到缓存
    savePaginationToCache(pageId, {
      current: page,
      pageSize: pageSize
    });
    
    // 调用外部回调
    if (onPaginationChange) {
      onPaginationChange(page, pageSize);
    }
  };

  // 构造标准分页配置
  const paginationConfig = showPagination ? {
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showQuickJumper: true,
    showTotal: (totalRecords: number) => `共 ${totalRecords} 条记录`,
    onChange: (page: number, pageSize?: number) => {
      handlePaginationChange(page, pageSize || pagination.pageSize);
    },
    onShowSizeChange: (_: number, size: number) => {
      handlePaginationChange(1, size);
    },
    style: { marginRight: '20px' }
  } : false;

  return (
    <Table
      {...restProps}
      dataSource={dataSource}
      pagination={paginationConfig}
    />
  );
}

export default StandardTable; 