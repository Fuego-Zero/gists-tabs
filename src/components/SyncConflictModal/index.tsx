import { ExclamationCircleFilled } from '@ant-design/icons';
import { App, Button, Modal, Space, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import Storage from '@/classes/Storage';
import useSyncState from '@/hooks/useSyncState';
import { formatLastError, t } from '@/i18n/translate';
import { downloadFile } from '@/utils/file';

const { Paragraph } = Typography;

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
      message.success(t('keepLocalOk'));
      setOpen(false);
    } catch (error) {
      console.error(error);
      message.error(t('conflictFail'));
    } finally {
      setBusy(false);
    }
  }

  async function useCloud() {
    setBusy(true);
    try {
      await Storage.resolveConflictUseCloud();
      message.success(t('useCloudOk'));
      setOpen(false);
    } catch (error) {
      console.error(error);
      message.error(t('conflictFail'));
    } finally {
      setBusy(false);
    }
  }

  async function exportBoth() {
    if (!conflict) {return;}

    try {
      await downloadFile(conflict.local, `yunjian-local-${Date.now()}.json`);
      await downloadFile(conflict.cloud, `yunjian-cloud-${Date.now()}.json`);
      message.success(t('exportBothOk'));
    } catch (error) {
      console.error(error);
      message.error(t('exportFail'));
    }
  }

  return (
    <Modal
      centered
      closable={false}
      footer={
        <Space wrap>
          <Button disabled={busy} onClick={exportBoth}>
            {t('exportBoth')}
          </Button>
          <Button danger disabled={busy} loading={busy} onClick={useCloud}>
            {t('useCloud')}
          </Button>
          <Button disabled={busy} loading={busy} type="primary" onClick={keepLocal}>
            {t('keepLocal')}
          </Button>
        </Space>
      }
      maskClosable={false}
      open={open}
      title={
        <span>
          <ExclamationCircleFilled className="mr-2 text-amber-500" />
          {t('conflictTitle')}
        </span>
      }
    >
      <Paragraph>{t('conflictBody')}</Paragraph>
      {syncState.lastError ? <Paragraph type="warning">{formatLastError(syncState.lastError)}</Paragraph> : null}
      <Paragraph type="secondary">
        {t('localUpdateAt')}：{conflict?.local.updateAt ?? '-'} / {t('cloudUpdateAt')}：{conflict?.cloud.updateAt ?? '-'}
        <br />
        {t('localRevision')}：{conflict?.local.syncMeta?.revision ?? t('none')}
        <br />
        {t('cloudRevision')}：{conflict?.cloud.syncMeta?.revision ?? t('none')}
      </Paragraph>
    </Modal>
  );
};

export default SyncConflictModal;
