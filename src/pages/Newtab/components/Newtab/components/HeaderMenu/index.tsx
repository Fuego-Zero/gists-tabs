import React, { useMemo, useState } from 'react';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  MenuOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { App, Button, Dropdown, Menu } from 'antd';

import EditForm from './components/EditForm';

import type { Props } from './types';

const HeaderMenu = (props: Props) => {
  const { activePageId, setActivePageId, pages, addPage, copyPage, delPage, editPage } = props;

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

  const dropdowns = useMemo(
    () => [
      {
        key: 'edit',
        label: (
          <span
            className="select-none"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            修改名称
          </span>
        ),
        icon: <EditOutlined />,
      },
      {
        key: 'copy',
        label: (
          <span
            className="select-none"
            onClick={() => {
              copyPage(activePageId);
              message.success('复制成功');
            }}
          >
            复制页面
          </span>
        ),
        icon: <CopyOutlined />,
      },
      {
        key: 'del',
        danger: !(pages.length === 1),
        disabled: pages.length === 1,
        label: (
          <span
            className="select-none"
            onClick={(e) => {
              if (pages.length === 1) return;

              const { shiftKey } = e;
              if (shiftKey) return delPage(activePageId);

              modal.confirm({
                title: '您确定要删除吗?',
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
            }}
          >
            删除页面
          </span>
        ),
        icon: <DeleteOutlined />,
      },
    ],
    [activePageId, copyPage, delPage, message, modal, pages.length],
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
      <Button
        ghost
        className="mr-[10px]"
        icon={<PlusOutlined />}
        shape="circle"
        size="small"
        onClick={() => {
          addPage();
          message.success('新增成功');
        }}
      />
      <Dropdown menu={{ items: dropdowns }} trigger={['click']}>
        <Button ghost icon={<MenuOutlined />} shape="circle" size="small" />
      </Dropdown>
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
