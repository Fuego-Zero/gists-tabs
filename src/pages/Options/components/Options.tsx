import React, { useEffect, useState } from 'react';

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Layout, Slider, Space, Switch } from 'antd';

import Storage from '@/classes/Storage';
import { checkToken } from '@/api/gists'; // eslint-disable-line perfectionist/sort-imports
import withTheme from '@/theme/withTheme';

const { Content } = Layout;

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

const BASE_INTERVAL = 5; // seconds

const Options = () => {
  const [token, setToken] = useState('');
  const [openCloudSync, setOpenCloudSync] = useState(false);
  const [cloudSyncInterval, setCloudSyncInterval] = useState(BASE_INTERVAL);

  useEffect(() => {
    Storage.getGistsToken().then((res) => {
      setToken(res);
    });

    Storage.getOpenCloudSync().then((res) => {
      setOpenCloudSync(res);
    });

    Storage.getCloudSyncInterval().then((res) => {
      if (res === undefined) Storage.setCloudSyncInterval(BASE_INTERVAL);
      setCloudSyncInterval((prev) => res ?? prev);
    });
  }, []);

  function resetHandler() {
    Storage.getGistsToken().then((res) => {
      setToken(res);
    });
  }

  const { message } = App.useApp();

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

  return (
    <Layout>
      <Content className="h-[100vh] pt-[100px] px-[20px]">
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
              <Button onClick={checkHandler}>测试</Button>
              <Button type="primary" onClick={saveHandler}>
                保存
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item label="云同步">
            <Switch
              value={openCloudSync}
              onChange={(e) => {
                setOpenCloudSync(e);
                Storage.setOpenCloudSync(e);
              }}
            />
          </Form.Item>
          {openCloudSync && (
            <Form.Item label="云同步频率">
              <Slider
                marks={[5, 150, 300, 450, 600].reduce(
                  (acc, cur) => {
                    acc[cur] = `${cur}秒`;
                    return acc;
                  },
                  {} as Record<number, string>,
                )}
                max={600}
                min={5}
                step={1}
                tooltip={{ formatter: (value) => `${value}秒` }}
                value={cloudSyncInterval}
                onChange={(value) => {
                  setCloudSyncInterval(value);
                  Storage.setCloudSyncInterval(value);
                }}
              />
            </Form.Item>
          )}
        </Form>
      </Content>
    </Layout>
  );
};

export default withTheme(Options);
