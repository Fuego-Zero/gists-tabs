import React, { useEffect, useState } from 'react';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { App, Button, Modal, Space, Typography } from 'antd';

import Storage from '@/classes/Storage';
import useSyncState from '@/hooks/useSyncState';
import { downloadFile } from '@/utils/file';

const { Paragraph, Text } = Typography;

const SyncConflictModal = () => {
  const syncState = useSyncState();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(syncState.status === 'conflict' && Boolean(syncState.conflict));
  }, [syncState]);

  const { conflict } = syncState;

  async function keepLocal() {
    setBusy(true);
    try {
      await Storage.resolveConflictKeepLocal();
      message.success('已保留本机并推送云端');
      setOpen(false);
    } catch (error) {
      console.error(error);
      message.error('处理冲突失败');
    } finally {
      setBusy(false);
    }
  }

  async function useCloud() {
    setBusy(true);
    try {
      await Storage.resolveConflictUseCloud();
      message.success('已采用云端数据');
      setOpen(false);
    } catch (error) {
      console.error(error);
      message.error('处理冲突失败');
    } finally {
      setBusy(false);
    }
  }

  async function exportBoth() {
    if (!conflict) return;
    try {
      await downloadFile(conflict.local, `yunjian-local-${Date.now()}.json`);
      await downloadFile(conflict.cloud, `yunjian-cloud-${Date.now()}.json`);
      message.success('已导出本机与云端 JSON');
    } catch (error) {
      console.error(error);
      message.error('导出失败');
    }
  }

  return (
    <Modal
      centered
      footer={
        <Space wrap>
          <Button disabled={busy} onClick={exportBoth}>
            导出两边 JSON
          </Button>
          <Button danger disabled={busy} loading={busy} onClick={useCloud}>
            采用云端
          </Button>
          <Button disabled={busy} loading={busy} type="primary" onClick={keepLocal}>
            保留本机并推云
          </Button>
        </Space>
      }
      title={
        <span>
          <ExclamationCircleFilled className="mr-2 text-amber-500" />
          同步冲突
        </span>
      }
      closable={false}
      maskClosable={false}
      open={open}
    >
      <Paragraph>
        云端与本机的 <Text code>revision</Text> 不一致（或云端为旧格式无
        revision）。禁止静默覆盖，请选择一侧（或先导出备份）。
      </Paragraph>
      {syncState.lastError ? <Paragraph type="warning">{syncState.lastError}</Paragraph> : null}
      <Paragraph type="secondary">
        本机 updateAt：{conflict?.local.updateAt ?? '-'} / 云端 updateAt：{conflict?.cloud.updateAt ?? '-'}
        <br />
        本机 revision：{conflict?.local.syncMeta?.revision ?? '（无）'}
        <br />
        云端 revision：{conflict?.cloud.syncMeta?.revision ?? '（无）'}
      </Paragraph>
    </Modal>
  );
};

export default SyncConflictModal;
