import React from 'react';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
  SwapOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown } from 'antd';

type Props = {
  actionDisabled?: boolean;
  copyWidget: () => void;
  delWidget: () => void;
  expanded: boolean;
  moveWidgetToPageModal: () => void;
  switchMode: () => void;
  toggleDisabled?: boolean;
  toggleExpand: () => void;
};

enum MenuAction {
  DELETE = 'delete',
  COPY = 'copy',
  MOVE = 'move',
}

const ExtraCard = (props: Props) => {
  const {
    actionDisabled,
    delWidget,
    copyWidget,
    switchMode,
    toggleDisabled,
    toggleExpand,
    expanded,
    moveWidgetToPageModal,
  } = props;

  const clickHandler: MenuProps['onClick'] = ({ key }) => {
    if (key === MenuAction.MOVE) return moveWidgetToPageModal();
    if (key === MenuAction.DELETE) return delWidget();
    if (key === MenuAction.COPY) return copyWidget();
  };

  const items: MenuProps['items'] = [
    {
      key: MenuAction.MOVE,
      label: '移动',
      icon: <SwapOutlined />,
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
        disabled={toggleDisabled || actionDisabled}
        icon={expanded ? <VerticalAlignTopOutlined /> : <VerticalAlignBottomOutlined />}
        size="small"
        type="text"
        onClick={() => {
          toggleExpand();
        }}
      />
      <Button
        disabled={actionDisabled}
        icon={<EditOutlined />}
        size="small"
        type="text"
        onClick={() => {
          switchMode();
        }}
      />
      <Dropdown disabled={actionDisabled} menu={{ items, onClick: clickHandler }} trigger={['hover']}>
        <Button disabled={actionDisabled} icon={<MenuOutlined />} size="small" type="text" />
      </Dropdown>
    </>
  );
};

export default ExtraCard;
