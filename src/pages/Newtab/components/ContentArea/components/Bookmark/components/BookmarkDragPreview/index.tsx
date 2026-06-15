import React, { useState } from 'react';
import { useDragLayer } from 'react-dnd';

import { BOOKMARK_DRAG_TYPE } from '../../dnd';
import mark from '../ShowCard/mark.svg';

import type { BookmarkDragItem } from '../../dnd';

const PREVIEW_OFFSET_X = 14;
const PREVIEW_OFFSET_Y = 10;
const PREVIEW_WIDTH = 320;

const isBookmarkDragItem = (item: BookmarkDragItem | null): item is BookmarkDragItem =>
  Boolean(
    item &&
      item.preview &&
      typeof item.preview.title === 'string' &&
      typeof item.preview.url === 'string' &&
      typeof item.preview.width === 'number',
  );

const BookmarkPreviewIcon = (props: { src: null | string }) => {
  const { src } = props;
  const [innerSrc, setInnerSrc] = useState(src ?? mark);

  return (
    <img
      alt=""
      className="h-[18px] w-[18px] shrink-0 rounded-[4px]"
      src={innerSrc}
      onError={() => {
        setInnerSrc(mark);
      }}
    />
  );
};

const getUrlLabel = (url: string) => {
  if (!url) return '';

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const BookmarkDragPreview = () => {
  const { currentOffset, isDragging, item, itemType } = useDragLayer((monitor) => ({
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem<BookmarkDragItem | null>(),
    itemType: monitor.getItemType(),
  }));

  if (itemType !== BOOKMARK_DRAG_TYPE || !isDragging || !currentOffset || !isBookmarkDragItem(item)) return null;

  const { icon, title, url } = item.preview;
  const urlLabel = getUrlLabel(url);

  return (
    <div
      style={{
        transform: `translate3d(${currentOffset.x + PREVIEW_OFFSET_X}px, ${currentOffset.y + PREVIEW_OFFSET_Y}px, 0)`,
        willChange: 'transform',
      }}
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
    >
      <div
        className="flex h-[40px] items-center gap-[8px] overflow-hidden rounded-[10px] border border-[rgba(5,5,5,0.08)] bg-[rgba(255,255,255,0.96)] px-[10px] shadow-[0_10px_28px_rgba(0,0,0,0.16)] ring-1 ring-[rgba(255,255,255,0.7)]"
        style={{ width: PREVIEW_WIDTH }}
      >
        <BookmarkPreviewIcon src={icon} />
        <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-[rgba(0,0,0,0.82)]">{title}</div>
        {urlLabel && (
          <div className="max-w-[96px] shrink-0 truncate rounded-full bg-[rgba(0,0,0,0.04)] px-[7px] py-[2px] text-[11px] text-[rgba(0,0,0,0.45)]">
            {urlLabel}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(BookmarkDragPreview);
