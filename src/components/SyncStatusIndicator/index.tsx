import React from 'react';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudSyncOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

import useSyncState from '@/hooks/useSyncState';
import { SYNC_STATUS_LABEL, type SyncStatus } from '@/types/sync';

const ICON: Record<SyncStatus, React.ReactNode> = {
  auth_failed: <StopOutlined />,
  conflict: <WarningOutlined />,
  failed: <ExclamationCircleOutlined />,
  pending: <ClockCircleOutlined />,
  rate_limited: <ClockCircleOutlined />,
  synced: <CheckCircleOutlined />,
  syncing: <LoadingOutlined />,
};

const COLOR: Record<SyncStatus, string> = {
  auth_failed: 'error',
  conflict: 'warning',
  failed: 'error',
  pending: 'processing',
  rate_limited: 'gold',
  synced: 'success',
  syncing: 'processing',
};

const SyncStatusIndicator = () => {
  const state = useSyncState();
  const label = SYNC_STATUS_LABEL[state.status];
  const title = state.lastError ? `${label}：${state.lastError}` : label;

  return (
    <Tooltip title={title}>
      <Tag className="mr-0 select-none" color={COLOR[state.status]} icon={ICON[state.status] || <CloudSyncOutlined />}>
        {label}
      </Tag>
    </Tooltip>
  );
};

export default SyncStatusIndicator;
