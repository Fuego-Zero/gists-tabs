import React, { useEffect, useState } from 'react';

import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { Button, Form, Input, Layout, Space } from 'antd';

import { checkToken } from '@/api/gists';
import Storage from '@/classes/Storage';
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

const Options = () => {
  const [token, setToken] = useState('');

  useEffect(() => {
    Storage.getGistsToken().then((res) => {
      setToken(res);
    });
  }, []);

  function resetHandler() {
    Storage.getGistsToken().then((res) => {
      setToken(res);
    });
  }

  function saveHandler() {
    Storage.setGistsToken(token);
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
        <Form className="w-[650px]">
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
        </Form>
      </Content>
    </Layout>
  );
};

export default withTheme(Options);
