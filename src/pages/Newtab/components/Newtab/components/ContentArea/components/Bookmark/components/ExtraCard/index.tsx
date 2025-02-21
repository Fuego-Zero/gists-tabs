import React from 'react';

import { CopyOutlined, DeleteOutlined, EditOutlined, MenuOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';

type Props = {
  copyWidget: () => void;
  delWidget: () => void;
  switchMode: () => void;
};

enum MenuAction {
  DELETE = 'delete',
  COPY = 'copy',
}

const ITEMS: MenuProps['items'] = [
  // {
  //   key: 'copy',
  //   label: '复制',
  //   icon: <CopyOutlined />,
  // },
  {
    key: MenuAction.COPY,
    label: '复制',
    icon: <CopyOutlined />,
  },
  {
    key: MenuAction.DELETE,
    danger: true,
    label: '删除',
    icon: <DeleteOutlined />,
  },
];

const ExtraCard = (props: Props) => {
  const { delWidget, copyWidget, switchMode } = props;

  const clickHandler: MenuProps['onClick'] = ({ key }) => {
    if (key === MenuAction.DELETE) return delWidget();
    if (key === MenuAction.COPY) return copyWidget();
  };

  return (
    <>
      <Button
        icon={<EditOutlined className="!text-[12px]" />}
        size="small"
        type="text"
        onClick={() => {
          switchMode();
        }}
      />
      <Dropdown menu={{ items: ITEMS, onClick: clickHandler }} trigger={['hover']}>
        <Button icon={<MenuOutlined className="!text-[12px]" />} size="small" type="text" />
      </Dropdown>
    </>
  );
};

export default ExtraCard;
