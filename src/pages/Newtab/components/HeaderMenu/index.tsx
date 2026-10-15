import React, { useMemo, useState } from 'react';

import {
  CloudDownloadOutlined,
  CloudSyncOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  HolderOutlined,
  MenuOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { App, Button, Dropdown, Menu, Space } from 'antd';

import Storage from '@/classes/Storage';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import useGistsTabs from '@/hooks/useGistsTabs';
import useSyncState from '@/hooks/useSyncState';
import { downloadFile, uploadFile } from '@/utils/file';

import EditForm from './components/EditForm';

import type { Props } from './types';

const HeaderMenu = (props: Props) => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const syncState = useSyncState();

  const { activePageId, setActivePageId, pages, addPage, copyPage, delPage, editPage, onSortModeStart } = props;

  const menus = useMemo(
    () =>
      pages.map((page) => ({
        key: page.id,
        label: page.name,
      })),
    [pages],
  );

  const { message, modal } = App.useApp();
  const [isOpen, setIsOpen] = useState(false);

  const dropdowns: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'edit',
        label: <span className="select-none">修改名称</span>,
        icon: <EditOutlined />,
        onClick: () => {
          setIsOpen(true);
        },
      },
      {
        key: 'copy',
        label: <span className="select-none">复制页面</span>,
        icon: <CopyOutlined />,
        onClick: () => {
          copyPage(activePageId);
          message.success('复制成功');
        },
      },
      {
        key: 'del',
        danger: !(pages.length === 1),
        disabled: pages.length === 1,
        label: <span className="select-none">删除页面</span>,
        icon: <DeleteOutlined />,
        onClick: ({ domEvent }) => {
          const { shiftKey } = domEvent;
          if (shiftKey) return delPage(activePageId);

          modal.confirm({
            title: '你确定要删除吗?',
            icon: <ExclamationCircleFilled />,
            content: '删除后所有数据都会消失',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
              delPage(activePageId);
              message.success('删除成功');
            },
          });
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'sync',
        label: <span className="select-none">立即同步</span>,
        icon: <CloudSyncOutlined />,
        disabled: syncState.status === 'conflict' || syncState.status === 'auth_failed',
        onClick: async () => {
          await Storage.syncGists();
          message.success('已触发同步');
        },
      },
      {
        key: 'pull',
        label: <span className="select-none">从云端拉取</span>,
        icon: <CloudDownloadOutlined />,
        onClick: () => {
          modal.confirm({
            title: '从云端拉取？',
            icon: <ExclamationCircleFilled />,
            content: '将用云端覆盖本机（覆盖前写入本地快照）。是否继续？',
            okText: '拉取',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
              const res = await Storage.pullFromCloudConfirmed();
              if (res.ok) message.success('拉取成功');
              else message.error(res.reason || '拉取失败');
            },
          });
        },
      },
      {
        key: 'retry',
        label: <span className="select-none">重试同步</span>,
        icon: <ReloadOutlined />,
        disabled: syncState.status === 'conflict' || syncState.status === 'auth_failed',
        onClick: async () => {
          await Storage.retrySync();
          message.info('已重试');
        },
      },
      {
        key: 'export',
        label: <span className="select-none">导出数据</span>,
        icon: <CloudDownloadOutlined />,
        onClick: async () => {
          if (!gistsTabs) {
            message.warning('没有数据可导出');
            return;
          }

          try {
            await downloadFile(gistsTabs, `gists-tabs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
            message.success('导出成功');
          } catch (error) {
            console.error('导出数据失败', error);
            message.error('导出失败，请稍后再试');
          }
        },
      },
      {
        key: 'import',
        danger: true,
        label: <span className="select-none">导入数据</span>,
        icon: <CloudUploadOutlined />,
        onClick: async () => {
          modal.confirm({
            title: '危险！',
            icon: <ExclamationCircleFilled />,
            content: '导入数据会覆盖当前所有数据，且不可恢复，是否继续？',
            okText: '继续',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
              try {
                const file = await uploadFile();
                if (!file) return;

                const text = await file.text();
                const data = JSON.parse(text);

                setGistsTabs(data);
                message.success('导入成功');
              } catch (error) {
                console.error('导入数据失败', error);
                message.error('导入失败，文件可能损坏');
              }
            },
          });
        },
      },
    ],
    [activePageId, copyPage, delPage, gistsTabs, message, modal, pages.length, setGistsTabs, syncState.status],
  );

  const currentPageName = useMemo(() => pages.find((page) => page.id === activePageId)?.name, [activePageId, pages]);

  return (
    <>
      <Menu
        items={menus}
        mode="horizontal"
        selectedKeys={[activePageId]}
        style={{ flex: 1, minWidth: 0 }}
        theme="dark"
        onSelect={(value) => {
          setActivePageId(value.key);
        }}
      />
      <Space className="mr-[10px]" size={8}>
        <SyncStatusIndicator />
        <Button
          ghost
          icon={<PlusOutlined />}
          shape="circle"
          size="small"
          onClick={() => {
            addPage();
            message.success('添加成功');
          }}
        />
        <Button
          ghost
          icon={<HolderOutlined />}
          shape="circle"
          size="small"
          onClick={() => {
            onSortModeStart('manual');
          }}
        />
        <Dropdown menu={{ items: dropdowns }} trigger={['click']}>
          <Button ghost icon={<MenuOutlined />} shape="circle" size="small" />
        </Dropdown>
      </Space>
      <EditForm
        name={currentPageName}
        open={isOpen}
        onCancel={() => {
          setIsOpen(false);
        }}
        onOk={(data) => {
          editPage(activePageId, data.name);
          setIsOpen(false);
        }}
      />
    </>
  );
};

export default HeaderMenu;
