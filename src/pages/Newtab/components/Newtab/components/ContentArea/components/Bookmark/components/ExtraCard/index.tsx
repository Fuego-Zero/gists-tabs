import React from 'react';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';

type Props = {
  copyWidget: () => void;
  delWidget: () => void;
  expanded: boolean;
  switchMode: () => void;
  toggleExpand: () => void;
};

enum MenuAction {
  DELETE = 'delete',
  COPY = 'copy',
  EXPAND = 'expand',
}

const ExtraCard = (props: Props) => {
  const { delWidget, copyWidget, switchMode, toggleExpand, expanded } = props;

  const clickHandler: MenuProps['onClick'] = ({ key }) => {
    if (key === MenuAction.DELETE) return delWidget();
    if (key === MenuAction.COPY) return copyWidget();
    if (key === MenuAction.EXPAND) return toggleExpand();
  };

  const items: MenuProps['items'] = [
    {
      key: MenuAction.EXPAND,
      label: expanded ? '收起' : '展开',
      icon: expanded ? <VerticalAlignTopOutlined /> : <VerticalAlignBottomOutlined />,
    },
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
      <Dropdown menu={{ items, onClick: clickHandler }} trigger={['hover']}>
        <Button icon={<MenuOutlined className="!text-[12px]" />} size="small" type="text" />
      </Dropdown>
    </>
  );
};

export default ExtraCard;
