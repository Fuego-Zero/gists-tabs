import React, { useEffect, useState } from 'react';

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Layout, List, Space, Switch, Typography } from 'antd';

import { checkToken } from '@/api/gists'; // eslint-disable-line perfectionist/sort-imports
import Storage from '@/classes/Storage';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import useSyncState from '@/hooks/useSyncState';
import withTheme from '@/theme/withTheme';
import { downloadFile } from '@/utils/file';

import type { SyncSnapshot } from '@/types/sync';

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

const Options = () => {
  const [token, setToken] = useState('');
  const [cloudSync, setCloudSync] = useState(false);
  const [snapshots, setSnapshots] = useState<SyncSnapshot[]>([]);
  const syncState = useSyncState();
  const { message, modal } = App.useApp();

  const refreshSnapshots = () => {
    Storage.getSnapshots().then(setSnapshots);
  };

  useEffect(() => {
    Storage.getGistsToken().then((res) => {
      setToken(res || '');
    });

    Storage.getCloudSync().then((res) => {
      setCloudSync(res);
    });

    refreshSnapshots();
  }, []);

  useEffect(() => {
    if (syncState.status === 'synced' || syncState.status === 'conflict') {
      refreshSnapshots();
    }
  }, [syncState.status]);

  function resetHandler() {
    Storage.getGistsToken().then((res) => {
      setToken(res || '');
    });
  }

  function saveHandler() {
    Storage.setGistsToken(token);
    message.success('保存成功');
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
      message.warning('没有数据可导出');
      return;
    }
    await downloadFile(data, `yunjian-current-${Date.now()}.json`);
    message.success('已导出当前数据');
  }

  async function exportSnapshot(snap: SyncSnapshot) {
    await downloadFile(snap.data, `yunjian-snapshot-${snap.id}.json`);
    message.success('已导出快照');
  }

  async function pushNow() {
    await Storage.syncGists();
    message.info('已触发立即同步');
  }

  function pullNow() {
    modal.confirm({
      title: '从云端拉取？',
      content: '将用云端数据覆盖本机（覆盖前会写入本地快照环）。是否继续？',
      okText: '拉取',
      cancelText: '取消',
      onOk: async () => {
        const res = await Storage.pullFromCloudConfirmed();
        if (res.ok) message.success('已从云端拉取');
        else message.error(res.reason || '拉取失败');
        refreshSnapshots();
      },
    });
  }

  async function retry() {
    await Storage.retrySync();
    message.info('已重试同步队列');
  }

  return (
    <Layout>
      <Content className="h-[100vh] overflow-auto px-[20px] pt-[100px]">
        <div className="mb-8 w-[650px]">
          <h1 className="m-0 text-2xl font-semibold">芸笺 · Gists Tabs</h1>
          <p className="mb-0 mt-1 text-gray-500">设置</p>
        </div>
        <Form className="w-[650px]" labelCol={{ span: 4 }}>
          <Form.Item label="Gists Token">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                suffix={<CheckStatusIcon status={checking} />}
                value={token}
                onChange={(e) => {
                  setChecking(CheckStatus.none);
                  setToken(e.target.value);
                }}
              />
              <Button onClick={resetHandler}>重置</Button>
              <Button onClick={checkHandler}>检测</Button>
              <Button type="primary" onClick={saveHandler}>
                保存
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item extra="开启后：数据改动将防抖落云（强云同步）。关闭则纯本机，零 GitHub 写请求。" label="云同步">
            <Switch
              value={cloudSync}
              onChange={(e) => {
                setCloudSync(e);
                Storage.setCloudSync(e);
              }}
            />
          </Form.Item>
          <Form.Item label="同步状态">
            <Space>
              <SyncStatusIndicator />
              {syncState.lastError ? <Text type="danger">{syncState.lastError}</Text> : null}
            </Space>
          </Form.Item>
          {cloudSync ? (
            <Form.Item label="同步操作">
              <Space wrap>
                <Button onClick={pushNow}>立即同步</Button>
                <Button onClick={pullNow}>从云端拉取</Button>
                <Button
                  disabled={syncState.status === 'auth_failed' || syncState.status === 'conflict'}
                  onClick={retry}
                >
                  重试队列
                </Button>
                <Button onClick={exportCurrent}>导出当前 JSON</Button>
              </Space>
            </Form.Item>
          ) : (
            <Form.Item label="导出">
              <Button onClick={exportCurrent}>导出当前 JSON</Button>
            </Form.Item>
          )}
          <Form.Item label="本地快照">
            <List
              bordered
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="export" size="small" type="link" onClick={() => exportSnapshot(item)}>
                      导出
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    description={new Date(item.at).toLocaleString()}
                    title={`${item.reason} · ${item.id.slice(0, 8)}`}
                  />
                </List.Item>
              )}
              dataSource={snapshots}
              locale={{ emptyText: '暂无快照' }}
              size="small"
            />
          </Form.Item>
        </Form>
      </Content>
    </Layout>
  );
};

export default withTheme(Options);
