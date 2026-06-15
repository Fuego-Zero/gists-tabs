import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';

import classNames from 'classnames';

import ContextMenu from '@/components/ContextMenu';

import { BOOKMARK_DRAG_TYPE } from '../../dnd';
import mark from './mark.svg';

import type { ContextMenuItems } from '@/components/ContextMenu/types';

import type { BookmarkDragItem } from '../../dnd';
import type { BookmarkHandler, BookmarkId, BookmarkProps } from '../../types';

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

type BookmarkDropPreview = {
  insertPosition: NonNullable<BookmarkDragItem['lastInsertPosition']>;
  sourceBookmarkId: BookmarkId;
  targetBookmarkId?: BookmarkId;
};

const BookmarkDropPlaceholder = () => (
  <li className="flex h-[32px] items-center px-[15px]">
    <div className="flex h-[24px] w-full items-center rounded-[6px] border border-dashed border-[#1677ff] bg-[#e6f4ff] px-[8px] shadow-[0_0_0_2px_rgba(22,119,255,0.1),inset_0_0_0_1px_rgba(22,119,255,0.14)]">
      <div className="h-[6px] w-full rounded-full bg-[rgba(22,119,255,0.22)]" />
    </div>
  </li>
);

type BookmarkItemProps = {
  bookmark: BookmarkProps['data']['bookmarks'][number];
  isBookmarkDragging?: boolean;
  isDropPreviewSource: boolean;
  isHovered: boolean;
  setDropPreview: React.Dispatch<React.SetStateAction<BookmarkDropPreview | null>>;
  setHoveredBookmarkId: React.Dispatch<React.SetStateAction<BookmarkId | null>>;
  setShowUrl: React.Dispatch<React.SetStateAction<string>>;
} & Pick<BookmarkHandler, 'copyBookmark' | 'deleteBookmark'> &
  Pick<BookmarkProps, 'id' | 'moveBookmark' | 'onBookmarkDragEnd' | 'onBookmarkDragStart'>;

const BookmarkItem = (props: BookmarkItemProps) => {
  const {
    bookmark,
    copyBookmark,
    deleteBookmark,
    id,
    isBookmarkDragging,
    isDropPreviewSource,
    isHovered,
    moveBookmark,
    onBookmarkDragEnd,
    onBookmarkDragStart,
    setHoveredBookmarkId,
    setDropPreview,
    setShowUrl,
  } = props;
  const itemRef = useRef<HTMLLIElement | null>(null);

  const [{ isDragging }, drag, preview] = useDrag<BookmarkDragItem, void, { isDragging: boolean }>(
    () => ({
      type: BOOKMARK_DRAG_TYPE,
      item: () => {
        setDropPreview(null);
        onBookmarkDragStart();

        return {
          bookmarkId: bookmark.id,
          preview: {
            icon: bookmark.icon,
            title: bookmark.title,
            url: bookmark.url,
            width: itemRef.current?.getBoundingClientRect().width ?? 240,
          },
          sourceWidgetId: id,
        };
      },
      end: () => {
        setDropPreview(null);
        onBookmarkDragEnd();
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [
      bookmark.icon,
      bookmark.id,
      bookmark.title,
      bookmark.url,
      id,
      onBookmarkDragEnd,
      onBookmarkDragStart,
      setDropPreview,
    ],
  );

  useEffect(() => {
    // Bookmark item 使用独立行内预览，隐藏 HTML5 backend 默认截图。
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

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
        // hover 阶段只更新落点预览和 drag item 元数据，不移动真实数据，避免拖拽源组件被卸载。
        const nextDropPreview: BookmarkDropPreview = {
          insertPosition,
          sourceBookmarkId: item.bookmarkId,
          targetBookmarkId: bookmark.id,
        };

        setDropPreview((current) => {
          if (
            current?.sourceBookmarkId === nextDropPreview.sourceBookmarkId &&
            current.targetBookmarkId === nextDropPreview.targetBookmarkId &&
            current.insertPosition === nextDropPreview.insertPosition
          ) {
            return current;
          }

          return nextDropPreview;
        });

        item.lastTargetWidgetId = id;
        item.lastTargetBookmarkId = bookmark.id;
        item.lastInsertPosition = insertPosition;
      },
      drop: (item, monitor) => {
        setDropPreview(null);
        // 拖起后放回原 li，属于 no-op；仍要通知上层结束草稿拖拽。
        if (item.sourceWidgetId === id && item.bookmarkId === bookmark.id) {
          onBookmarkDragEnd();

          return { handled: true };
        }

        const element = itemRef.current;
        const clientOffset = monitor.getClientOffset();
        const hoverRect = element?.getBoundingClientRect();
        // drop 时重新计算一次 before/after，兜住最后一帧 hover 没触发的情况。
        let insertPosition =
          item.lastTargetWidgetId === id && item.lastTargetBookmarkId === bookmark.id
            ? item.lastInsertPosition
            : undefined;

        if (hoverRect && clientOffset) {
          insertPosition = clientOffset.y - hoverRect.top > (hoverRect.bottom - hoverRect.top) / 2 ? 'after' : 'before';
        }

        moveBookmark({
          bookmarkId: item.bookmarkId,
          insertPosition,
          sourceWidgetId: item.sourceWidgetId,
          targetBookmarkId: bookmark.id,
          targetWidgetId: id,
        });
        onBookmarkDragEnd();

        return { handled: true };
      },
    }),
    [bookmark.id, id, moveBookmark, onBookmarkDragEnd, setDropPreview],
  );

  const setItemRef = useCallback(
    (node: HTMLLIElement | null) => {
      itemRef.current = node;
      drag(drop(node));
    },
    [drag, drop],
  );

  let itemStyle: React.CSSProperties | undefined;
  const isSourcePlaceholder = isDragging && !isDropPreviewSource;

  if (isDropPreviewSource) {
    // 当源位置已经渲染显式占位时，原 li 只保留布局信息，避免看到双份内容。
    itemStyle = { opacity: 0, pointerEvents: 'none', position: 'absolute' };
  }

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
        className={classNames(styles.link, {
          [styles.hovered]: isHovered && !isBookmarkDragging,
          [styles.sourcePlaceholder]: isSourcePlaceholder,
        })}
        style={itemStyle}
        onClick={() => {
          window.open(bookmark.url);
        }}
        onMouseEnter={() => {
          if (!isBookmarkDragging) {
            setHoveredBookmarkId(bookmark.id);
            setShowUrl(bookmark.url);
          }
        }}
        onMouseLeave={() => {
          setHoveredBookmarkId((current) => (current === bookmark.id ? null : current));
          setShowUrl('');
        }}
      >
        <Icon src={bookmark.icon} />
        <div className="title">{bookmark.title}</div>
      </li>
    </ContextMenu>
  );
};

type Props = Pick<
  BookmarkProps,
  'data' | 'id' | 'isBookmarkDragging' | 'moveBookmark' | 'onBookmarkDragEnd' | 'onBookmarkDragStart'
> &
  Pick<BookmarkHandler, 'copyBookmark' | 'deleteBookmark'>;

const ShowCard = (props: Props) => {
  const {
    data,
    deleteBookmark,
    copyBookmark,
    id,
    isBookmarkDragging,
    moveBookmark,
    onBookmarkDragEnd,
    onBookmarkDragStart,
  } = props;
  const [dropPreview, setDropPreview] = useState<BookmarkDropPreview | null>(null);
  const [hoveredBookmarkId, setHoveredBookmarkId] = useState<BookmarkId | null>(null);
  const [showUrl, setShowUrl] = useState('');

  const [{ isOver }, dropList] = useDrop<BookmarkDragItem, { handled: boolean }, { isOver: boolean }>(
    () => ({
      accept: BOOKMARK_DRAG_TYPE,
      hover: (item, monitor) => {
        if (!monitor.isOver({ shallow: true })) return;
        // 有具体 li 时由 li 自己计算落点；列表级 hover 只服务空列表承接。
        if (data.bookmarks.length > 0) return;

        const lastBookmark = data.bookmarks[data.bookmarks.length - 1];
        if (item.sourceWidgetId === id && lastBookmark?.id === item.bookmarkId) return;

        const nextDropPreview: BookmarkDropPreview = {
          insertPosition: 'after',
          sourceBookmarkId: item.bookmarkId,
          targetBookmarkId: lastBookmark?.id,
        };

        setDropPreview((current) => {
          if (
            current?.sourceBookmarkId === nextDropPreview.sourceBookmarkId &&
            current.targetBookmarkId === nextDropPreview.targetBookmarkId &&
            current.insertPosition === nextDropPreview.insertPosition
          ) {
            return current;
          }

          return nextDropPreview;
        });

        item.lastTargetWidgetId = id;
        item.lastTargetBookmarkId = lastBookmark?.id;
        item.lastInsertPosition = 'after';
      },
      drop: (item, monitor) => {
        setDropPreview(null);

        if (monitor.didDrop()) return;

        // 行级 drop 没命中时，列表级 drop 用最近一次 hover 记录的落点兜底，避免跨 card 默认追加到尾部。
        const hasRecordedTarget = item.lastTargetWidgetId === id;
        const targetBookmarkId = hasRecordedTarget ? item.lastTargetBookmarkId : undefined;
        const insertPosition = hasRecordedTarget ? item.lastInsertPosition : undefined;
        const lastBookmark = data.bookmarks[data.bookmarks.length - 1];
        if (!targetBookmarkId && item.sourceWidgetId === id && lastBookmark?.id === item.bookmarkId) {
          onBookmarkDragEnd();

          return { handled: true };
        }

        moveBookmark({
          bookmarkId: item.bookmarkId,
          insertPosition,
          sourceWidgetId: item.sourceWidgetId,
          targetBookmarkId,
          targetWidgetId: id,
        });

        onBookmarkDragEnd();

        return { handled: true };
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [data.bookmarks, id, moveBookmark, onBookmarkDragEnd],
  );

  useEffect(() => {
    if (!isOver) {
      setDropPreview(null);
    }
  }, [isOver]);

  useEffect(() => {
    if (!isBookmarkDragging) return;

    // 跨 card 拖拽时禁用普通 hover/url 展示，避免悬浮样式和落点占位混在一起。
    setHoveredBookmarkId(null);
    setShowUrl('');
  }, [isBookmarkDragging]);

  return (
    <>
      <ul ref={dropList}>
        {data.bookmarks.map((bookmark) => (
          <React.Fragment key={bookmark.id}>
            {dropPreview?.targetBookmarkId === bookmark.id && dropPreview.insertPosition === 'before' && (
              <BookmarkDropPlaceholder />
            )}
            <BookmarkItem
              bookmark={bookmark}
              copyBookmark={copyBookmark}
              deleteBookmark={deleteBookmark}
              id={id}
              isBookmarkDragging={isBookmarkDragging}
              isDropPreviewSource={dropPreview?.sourceBookmarkId === bookmark.id}
              isHovered={hoveredBookmarkId === bookmark.id}
              moveBookmark={moveBookmark}
              setDropPreview={setDropPreview}
              setHoveredBookmarkId={setHoveredBookmarkId}
              setShowUrl={setShowUrl}
              onBookmarkDragEnd={onBookmarkDragEnd}
              onBookmarkDragStart={onBookmarkDragStart}
            />
            {dropPreview?.targetBookmarkId === bookmark.id && dropPreview.insertPosition === 'after' && (
              <BookmarkDropPlaceholder />
            )}
          </React.Fragment>
        ))}
        {dropPreview && !dropPreview.targetBookmarkId && <BookmarkDropPlaceholder />}
      </ul>
      <ShowUrl url={showUrl} />
    </>
  );
};

export default ShowCard;
