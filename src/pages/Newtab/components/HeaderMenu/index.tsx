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
  MoonOutlined,
  PlusOutlined,
  ReloadOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { App, Button, Dropdown, Menu, type MenuProps, Space, Tooltip  } from 'antd';
import React, { useMemo, useState } from 'react';

import Storage from '@/classes/Storage';
import useGistsTabs from '@/hooks/useGistsTabs';
import { useStorageItem } from '@/hooks/useStorageItem';
import useSyncState from '@/hooks/useSyncState';
import { pageTitle, t } from '@/i18n/translate';
import { localeItem, themeItem } from '@/storage/items';
import { parseCanvas } from '@/storage/syncRules';
import { repairWidgetPositions } from '@/storage/widgetPositions';
import { upgradeGistsTabsToV1 } from '@/utils/data/upgrade';
import { downloadFile, uploadFile } from '@/utils/file';
import { runSyncCommand } from '@/utils/syncNotice';

import { useSyncErrorNotice } from '../../hooks/useSyncErrorNotice';
import EditForm from './components/EditForm';
import type { Props } from './types';

const HeaderMenu = (props: Props) => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const syncState = useSyncState();
  const mode = useStorageItem(themeItem, 'light');
  const locale = useStorageItem(localeItem, 'zh_CN');

  const { activePageId, setActivePageId, pages, addPage, copyPage, delPage, editPage, onSortModeStart } = props;

  const menus = useMemo(
    () =>
      pages.map((page) => ({
        key: page.id,
        label: pageTitle(page),
      })),
    [locale, pages],
  );

  const { message, modal } = App.useApp();
  useSyncErrorNotice(message);
  const [isOpen, setIsOpen] = useState(false);

  const dropdowns: MenuProps['items'] = useMemo(
    () => [
      {
        key: 'edit',
        label: <span className="select-none">{t('editName')}</span>,
        icon: <EditOutlined />,
        onClick: () => {
          setIsOpen(true);
        },
      },
      {
        key: 'copy',
        label: <span className="select-none">{t('copyPage')}</span>,
        icon: <CopyOutlined />,
        onClick: () => {
          copyPage(activePageId);
          message.success(t('copyOk'));
        },
      },
      {
        key: 'del',
        danger: !(pages.length === 1),
        disabled: pages.length === 1,
        label: <span className="select-none">{t('deletePage')}</span>,
        icon: <DeleteOutlined />,
        onClick: ({ domEvent }) => {
          const { shiftKey } = domEvent;
          if (shiftKey) {return delPage(activePageId);}

          modal.confirm({
            title: t('deleteConfirm'),
            icon: <ExclamationCircleFilled />,
            content: t('deleteData'),
            okText: t('delete'),
            okType: 'danger',
            cancelText: t('cancel'),
            onOk() {
              delPage(activePageId);
              message.success(t('deleteOk'));
            },
          });
        },
      },
      {
        type: 'divider',
      },
      {
        key: 'sync',
        label: <span className="select-none">{t('syncNow')}</span>,
        icon: <CloudSyncOutlined />,
        disabled: syncState.status === 'conflict' || syncState.status === 'auth_failed',
        onClick: () => {
          void runSyncCommand(message, () => Storage.syncGists(), {
            failText: t('errSync'),
            okText: t('statusSynced'),
          });
        },
      },
      {
        key: 'pull',
        label: <span className="select-none">{t('pullFromCloud')}</span>,
        icon: <CloudDownloadOutlined />,
        onClick: () => {
          modal.confirm({
            title: t('pullTitle'),
            icon: <ExclamationCircleFilled />,
            content: t('pullConfirmPage'),
            okText: t('pull'),
            okType: 'danger',
            cancelText: t('cancel'),
            onOk: () => runSyncCommand(message, () => Storage.pullFromCloudConfirmed(), {
              failText: t('pullFail'),
              okText: t('pullOk'),
            }),
          });
        },
      },
      {
        key: 'retry',
        label: <span className="select-none">{t('retry')}</span>,
        icon: <ReloadOutlined />,
        disabled: syncState.status === 'conflict' || syncState.status === 'auth_failed',
        onClick: () => {
          void runSyncCommand(message, () => Storage.retrySync(), {
            failText: t('errSync'),
            okText: t('statusSynced'),
          });
        },
      },
      {
        key: 'export',
        label: <span className="select-none">{t('exportData')}</span>,
        icon: <CloudDownloadOutlined />,
        onClick: async () => {
          if (!gistsTabs) {
            message.warning(t('noData'));
            return;
          }

          try {
            await downloadFile(gistsTabs, `gists-tabs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
            message.success(t('exportOk'));
          } catch (error) {
            console.error('导出数据失败', error);
            message.error(t('exportFailLater'));
          }
        },
      },
      {
        key: 'import',
        danger: true,
        label: <span className="select-none">{t('importData')}</span>,
        icon: <CloudUploadOutlined />,
        onClick: async () => {
          modal.confirm({
            title: t('importTitle'),
            icon: <ExclamationCircleFilled />,
            content: t('importDanger'),
            okText: t('continue'),
            okType: 'danger',
            cancelText: t('cancel'),
            onOk: async () => {
              try {
                const file = await uploadFile();
                if (!file) {return;}

                const repaired = repairWidgetPositions(JSON.parse(await file.text()));
                const parsed = parseCanvas(repaired.value);
                if (!parsed) {
                  message.error(t('importFail'));
                  return;
                }

                // 导入的是画布内容；文件里的 syncMeta 属于别的同步位置，不能带进本机。
                const { pages, version } = parsed.version === 1 ? parsed : upgradeGistsTabsToV1(parsed);
                await setGistsTabs({ pages, updateAt: Date.now(), version });
                message.success(t('importOk'));
              } catch (error) {
                console.error('导入数据失败', error);
                message.error(t('importFail'));
              }
            },
          });
        },
      },
    ],
    [activePageId, copyPage, delPage, gistsTabs, locale, message, modal, pages.length, setGistsTabs, syncState.status],
  );

  const currentPageName = useMemo(
    () => {
      const page = pages.find((item) => item.id === activePageId);
      return page ? pageTitle(page) : undefined;
    },
    [activePageId, locale, pages],
  );

  return (
    <>
      <Menu
        items={menus}
        mode="horizontal"
        selectedKeys={[activePageId]}
        style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }}
        theme="light"
        onSelect={(value) => {
          setActivePageId(value.key);
        }}
      />
      <Space className="mr-[10px]" size={8}>
        <Tooltip title={mode === 'dark' ? t('light') : t('dark')}>
          <Button
            aria-label={mode === 'dark' ? t('light') : t('dark')}
            icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            shape="circle"
            size="small"
            type="text"
            onClick={() => {
              void themeItem.setValue(mode === 'dark' ? 'light' : 'dark');
            }}
          />
        </Tooltip>
        <Button
          icon={<PlusOutlined />}
          shape="circle"
          size="small"
          type="text"
          onClick={() => {
            addPage();
            message.success(t('addOk'));
          }}
        />
        <Button
          icon={<HolderOutlined />}
          shape="circle"
          size="small"
          type="text"
          onClick={() => {
            onSortModeStart('manual');
          }}
        />
        <Dropdown menu={{ items: dropdowns }} trigger={['click']}>
          <Button icon={<MenuOutlined />} shape="circle" size="small" type="text" />
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
