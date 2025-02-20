import React, { useState } from 'react';

import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';

import ContextMenu from '@/components/ContextMenu';

import mark from './mark.svg';

import type { ContextMenuItems } from '@/components/ContextMenu/types';

import type { BookmarkProps, CopyBookmark, DeleteBookmark } from '../../types';

import styles from './style.module.scss';

const Icon = (props: { src: null | string }) => {
  const { src } = props;
  const [innerSrc, setInnerSrc] = useState(src ?? mark);

  return (
    <img
      alt="icon"
      className="icon"
      src={innerSrc}
      onError={() => {
        setInnerSrc(mark);
      }}
    ></img>
  );
};

enum MenuAction {
  DELETE = 'delete',
  COPY = 'copy',
}

const ITEMS: ContextMenuItems<MenuAction> = [
  { title: '删除', value: MenuAction.DELETE, icon: <DeleteOutlined className="text-danger" /> },
  { title: '复制', value: MenuAction.COPY, icon: <CopyOutlined /> },
];

type Props = {
  copyBookmark: CopyBookmark;
  deleteBookmark: DeleteBookmark;
} & Pick<BookmarkProps, 'data'>;

const ShowCard = (props: Props) => {
  const { data, deleteBookmark, copyBookmark } = props;

  return (
    <ul>
      {data.map((bookmark) => (
        <ContextMenu
          key={bookmark.id}
          items={ITEMS}
          onSelect={(value) => {
            if (value === MenuAction.DELETE) return deleteBookmark(bookmark.id);
            if (value === MenuAction.COPY) return copyBookmark(bookmark.id);
          }}
        >
          <li
            className={styles.link}
            onClick={() => {
              window.open(bookmark.url);
            }}
          >
            <Icon src={bookmark.icon} />
            <div className="title">{bookmark.title}</div>
          </li>
        </ContextMenu>
      ))}
    </ul>
  );
};

export default ShowCard;
