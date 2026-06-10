import React, { useCallback, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';

import ContextMenu from '@/components/ContextMenu';

import { BOOKMARK_DRAG_TYPE } from '../../dnd';
import mark from './mark.svg';

import type { ContextMenuItems } from '@/components/ContextMenu/types';

import type { BookmarkDragItem } from '../../dnd';
import type { BookmarkHandler, BookmarkProps } from '../../types';

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

const ShowUrl = (props: { url: string }) => {
  const { url } = props;
  if (!url) return null;
  return (
    <div className="fixed z-[1000] bottom-0 left-0 bg-zinc-300 px-[5px] rounded-r truncate max-w-[75%]">{url}</div>
  );
};

type BookmarkItemProps = {
  bookmark: BookmarkProps['data']['bookmarks'][number];
  setShowUrl: React.Dispatch<React.SetStateAction<string>>;
} & Pick<BookmarkHandler, 'copyBookmark' | 'deleteBookmark'> &
  Pick<BookmarkProps, 'id' | 'moveBookmark' | 'onBookmarkDragEnd' | 'onBookmarkDragStart'>;

const BookmarkItem = (props: BookmarkItemProps) => {
  const {
    bookmark,
    copyBookmark,
    deleteBookmark,
    id,
    moveBookmark,
    onBookmarkDragEnd,
    onBookmarkDragStart,
    setShowUrl,
  } = props;
  const itemRef = useRef<HTMLLIElement | null>(null);

  const [{ isDragging }, drag] = useDrag<BookmarkDragItem, void, { isDragging: boolean }>(
    () => ({
      type: BOOKMARK_DRAG_TYPE,
      item: () => {
        onBookmarkDragStart();

        return { bookmarkId: bookmark.id, sourceWidgetId: id };
      },
      end: () => {
        onBookmarkDragEnd();
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [bookmark.id, id, onBookmarkDragEnd, onBookmarkDragStart],
  );

  const [, drop] = useDrop<BookmarkDragItem>(
    () => ({
      accept: BOOKMARK_DRAG_TYPE,
      hover: (item, monitor) => {
        const element = itemRef.current;
        const clientOffset = monitor.getClientOffset();

        if (!element || !clientOffset) return;
        if (item.sourceWidgetId === id && item.bookmarkId === bookmark.id) return;

        const hoverRect = element.getBoundingClientRect();
        const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
        const hoverClientY = clientOffset.y - hoverRect.top;
        const insertPosition = hoverClientY > hoverMiddleY ? 'after' : 'before';

        if (
          item.lastTargetWidgetId === id &&
          item.lastTargetBookmarkId === bookmark.id &&
          item.lastInsertPosition === insertPosition
        ) {
          return;
        }

        moveBookmark({
          bookmarkId: item.bookmarkId,
          insertPosition,
          sourceWidgetId: item.sourceWidgetId,
          targetBookmarkId: bookmark.id,
          targetWidgetId: id,
        });

        item.sourceWidgetId = id;
        item.lastTargetWidgetId = id;
        item.lastTargetBookmarkId = bookmark.id;
        item.lastInsertPosition = insertPosition;
      },
      drop: () => ({ handled: true }),
    }),
    [bookmark.id, id, moveBookmark],
  );

  const setItemRef = useCallback(
    (node: HTMLLIElement | null) => {
      itemRef.current = node;
      drag(drop(node));
    },
    [drag, drop],
  );

  return (
    <ContextMenu
      items={ITEMS}
      onSelect={(value, { shiftKey }) => {
        if (value === MenuAction.DELETE) return deleteBookmark(bookmark.id, shiftKey);
        if (value === MenuAction.COPY) return copyBookmark(bookmark.id);
      }}
    >
      <li
        ref={setItemRef}
        className={styles.link}
        style={isDragging ? { opacity: 0.36 } : undefined}
        onClick={() => {
          window.open(bookmark.url);
        }}
        onMouseEnter={() => {
          setShowUrl(bookmark.url);
        }}
        onMouseLeave={() => {
          setShowUrl('');
        }}
      >
        <Icon src={bookmark.icon} />
        <div className="title">{bookmark.title}</div>
      </li>
    </ContextMenu>
  );
};

type Props = Pick<BookmarkHandler, 'copyBookmark' | 'deleteBookmark'> &
  Pick<BookmarkProps, 'data' | 'id' | 'moveBookmark' | 'onBookmarkDragEnd' | 'onBookmarkDragStart'>;

const ShowCard = (props: Props) => {
  const { data, deleteBookmark, copyBookmark, id, moveBookmark, onBookmarkDragEnd, onBookmarkDragStart } = props;
  const [showUrl, setShowUrl] = useState('');

  const [, dropList] = useDrop<BookmarkDragItem>(
    () => ({
      accept: BOOKMARK_DRAG_TYPE,
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;

        const lastBookmark = data.bookmarks[data.bookmarks.length - 1];
        if (item.sourceWidgetId === id && lastBookmark?.id === item.bookmarkId) return;

        moveBookmark({
          bookmarkId: item.bookmarkId,
          sourceWidgetId: item.sourceWidgetId,
          targetWidgetId: id,
        });

        item.sourceWidgetId = id;

        return { handled: true };
      },
    }),
    [data.bookmarks, id, moveBookmark],
  );

  return (
    <>
      <ul ref={dropList}>
        {data.bookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            copyBookmark={copyBookmark}
            deleteBookmark={deleteBookmark}
            id={id}
            moveBookmark={moveBookmark}
            setShowUrl={setShowUrl}
            onBookmarkDragEnd={onBookmarkDragEnd}
            onBookmarkDragStart={onBookmarkDragStart}
          />
        ))}
      </ul>
      <ShowUrl url={showUrl} />
    </>
  );
};

export default ShowCard;
