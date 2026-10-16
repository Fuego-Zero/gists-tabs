import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Layout, List, Space, Switch, Typography } from 'antd';
import React, { useEffect, useState } from 'react';

import { checkToken } from '@/api/gists';  
import Storage from '@/classes/Storage';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import { useStorageItem } from '@/hooks/useStorageItem';
import useSyncState from '@/hooks/useSyncState';
import { formatLastError, t } from '@/i18n/translate';
import { cloudSyncItem, gistsTokenItem, localeItem, syncSnapshotsItem, themeItem } from '@/storage/items';
import withTheme from '@/theme/withTheme';
import type { SyncSnapshot } from '@/types/sync';
import { downloadFile } from '@/utils/file';

const { Content } = Layout;
const { Text } = Typography;

enum CheckStatus {
  success,
  failed,
  testing,
  none,
}

const CheckStatusIcon = (props: { status: CheckStatus }) => {
  const { status } = props;

  switch (status) {
    case CheckStatus.none:
      return null;

    case CheckStatus.failed:
      return <CloseCircleFilled className="text-red-600" />;

    case CheckStatus.success:
      return <CheckCircleFilled className="text-green-600" />;

    case CheckStatus.testing:
      return <LoadingOutlined className="text-gray-600" />;
  }
};

const EMPTY_SNAPSHOTS: SyncSnapshot[] = [];

const Options = () => {
  const savedToken = useStorageItem(gistsTokenItem, '');
  const cloudSync = useStorageItem(cloudSyncItem, false);
  const snapshots = useStorageItem(syncSnapshotsItem, EMPTY_SNAPSHOTS) ?? EMPTY_SNAPSHOTS;
  const mode = useStorageItem(themeItem, 'light');
  const locale = useStorageItem(localeItem, 'zh_CN');
  const [token, setToken] = useState('');
  const syncState = useSyncState();
  const { message, modal } = App.useApp();

  useEffect(() => {
    setToken(savedToken || '');
  }, [savedToken]);

  function resetHandler() {
    Storage.getGistsToken().then((res) => {
      setToken(res || '');
    });
  }

  function saveHandler() {
    Storage.setGistsToken(token);
    message.success(t('saveOk'));
  }

  const [checking, setChecking] = useState(CheckStatus.none);

  function checkHandler() {
    setChecking(CheckStatus.testing);
    checkToken(token)
      .then(() => {
        setChecking(CheckStatus.success);
      })
      .catch(() => {
        setChecking(CheckStatus.failed);
      });
  }

  async function exportCurrent() {
    const data = await Storage.getGistsTabs();
    if (!data) {
      message.warning(t('noData'));
      return;
    }

    await downloadFile(data, `yunjian-current-${Date.now()}.json`);
    message.success(t('exportedCurrent'));
  }

  async function exportSnapshot(snap: SyncSnapshot) {
    await downloadFile(snap.data, `yunjian-snapshot-${snap.id}.json`);
    message.success(t('exportSnapshotOk'));
  }

  async function pushNow() {
    await Storage.syncGists();
    message.info(t('syncTriggeredInfo'));
  }

  function pullNow() {
    modal.confirm({
      title: t('pullTitle'),
      content: t('pullConfirmOptions'),
      okText: t('pull'),
      cancelText: t('cancel'),
      onOk: async () => {
        const res = await Storage.pullFromCloudConfirmed();
        if (res.ok) {message.success(t('pullOkOptions'));}
        else {message.error(res.reason || t('pullFail'));}
      },
    });
  }

  async function retry() {
    await Storage.retrySync();
    message.info(t('retryQueued'));
  }

  return (
    <Layout>
      <Content className="h-[100vh] overflow-auto px-[20px] pt-[100px]">
        <div className="mb-8 w-[650px]">
          <h1 className="m-0 text-2xl font-semibold">{t('appTitle')}</h1>
          <p className="mb-0 mt-1 text-gray-500">{t('settings')}</p>
        </div>
        <Form className="w-[650px]" labelCol={{ span: 4 }}>
          <Form.Item label={t('token')}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                suffix={<CheckStatusIcon status={checking} />}
                value={token}
                onChange={(e) => {
                  setChecking(CheckStatus.none);
                  setToken(e.target.value);
                }}
              />
              <Button onClick={resetHandler}>{t('reset')}</Button>
              <Button onClick={checkHandler}>{t('check')}</Button>
              <Button type="primary" onClick={saveHandler}>
                {t('save')}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item extra={t('cloudSyncExtra')} label={t('cloudSync')}>
            <Switch
              checked={Boolean(cloudSync)}
              onChange={(open) => {
                void Storage.setCloudSync(open);
              }}
            />
          </Form.Item>
          <Form.Item label={t('theme')}>
            <Switch
              checked={mode === 'dark'}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              onChange={(dark) => {
                void themeItem.setValue(dark ? 'dark' : 'light');
              }}
            />
          </Form.Item>
          <Form.Item label={t('language')}>
            <Switch
              checked={locale === 'en'}
              checkedChildren={t('en')}
              unCheckedChildren={t('zh')}
              onChange={(english) => {
                void localeItem.setValue(english ? 'en' : 'zh_CN');
              }}
            />
          </Form.Item>
          <Form.Item label={t('syncStatus')}>
            <Space>
              <SyncStatusIndicator />
              {syncState.lastError ? <Text type="danger">{formatLastError(syncState.lastError)}</Text> : null}
            </Space>
          </Form.Item>
          {cloudSync ? (
              <Form.Item label={t('syncActions')}>
              <Space wrap>
                <Button onClick={pushNow}>{t('syncNow')}</Button>
                <Button onClick={pullNow}>{t('pullFromCloud')}</Button>
                <Button
                  disabled={syncState.status === 'auth_failed' || syncState.status === 'conflict'}
                  onClick={retry}
                >
                  {t('retryQueue')}
                </Button>
                <Button onClick={exportCurrent}>{t('exportCurrent')}</Button>
              </Space>
            </Form.Item>
          ) : (
            <Form.Item label={t('export')}>
              <Button onClick={exportCurrent}>{t('exportCurrent')}</Button>
            </Form.Item>
          )}
          <Form.Item label={t('localSnapshots')}>
            <List
              bordered
              dataSource={snapshots}
              locale={{ emptyText: t('emptySnapshots') }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="export" size="small" type="link" onClick={() => exportSnapshot(item)}>
                      {t('export')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    description={new Date(item.at).toLocaleString()}
                    title={`${item.reason} · ${item.id.slice(0, 8)}`}
                  />
                </List.Item>
              )}
              size="small"
            />
          </Form.Item>
        </Form>
      </Content>
    </Layout>
  );
};

export default withTheme(Options);
