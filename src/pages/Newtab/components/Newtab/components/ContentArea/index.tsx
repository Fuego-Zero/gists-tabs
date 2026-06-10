import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDragLayer } from 'react-dnd';

import { EditOutlined, MenuOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Col, Dropdown, Row } from 'antd';

import classNames from 'classnames';

import { clone } from '@/utils';

import { moveBookmarkInWidgets } from '../../utils/bookmarkPosition';
import Bookmark from './components/Bookmark';
import DraggableWidget from './components/DraggableWidget';

import type { Page, Widget } from '@/types';

import type { WidgetColumnEdgePosition, WidgetInsertPosition } from '../../types';
import type { MoveBookmarkParams } from '../../utils/bookmarkPosition';
import type { Props } from './types';

import styles from './style.module.scss';

type DropPreview = {
  insertPosition: WidgetInsertPosition;
  sourceId: Widget['id'];
  targetId: Widget['id'];
};

type WidgetDragItem = {
  id: Widget['id'];
  width: number;
};

const sortContextMenuItems: MenuProps['items'] = [
  {
    key: 'top',
    label: '置顶',
    icon: <VerticalAlignTopOutlined />,
  },
  {
    key: 'bottom',
    label: '置底',
    icon: <VerticalAlignBottomOutlined />,
  },
];

const DropPlaceholder = () => (
  <Col span={24}>
    <div
      className={`${styles.dropPlaceholder} flex h-[52px] items-center rounded-[8px] border-2 border-dashed border-[#1677ff] bg-[#e6f4ff] px-[12px] shadow-[0_0_0_3px_rgba(22,119,255,0.12),inset_0_0_0_1px_rgba(22,119,255,0.2)]`}
    >
      <div className="h-[8px] w-full rounded-full bg-[rgba(22,119,255,0.24)]" />
    </div>
  </Col>
);

const DragLayerPreview = (props: { widgets: Widget[] }) => {
  const { widgets } = props;
  const { currentOffset, item, isDragging } = useDragLayer((monitor) => ({
    currentOffset: monitor.getSourceClientOffset(),
    item: monitor.getItem<WidgetDragItem | null>(),
    isDragging: monitor.isDragging(),
  }));

  const widget = widgets.find(({ id }) => id === item?.id);

  if (!isDragging || !currentOffset || !widget) return null;

  const previewWidth = item?.width ?? 320;

  return (
    <div
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ transform: `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)` }}
    >
      <div
        className="overflow-hidden rounded-[8px] border border-[rgba(5,5,5,0.06)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-[rgba(22,119,255,0.2)]"
        style={{ width: previewWidth }}
      >
        <div className="flex h-[61px] items-center justify-between border-b border-[rgba(5,5,5,0.06)] px-[12px]">
          <div className="min-w-0 flex-1 truncate font-medium text-[rgba(0,0,0,0.88)]">{widget.name}</div>
          <div className="ml-[12px] flex items-center gap-[8px] text-[rgba(0,0,0,0.45)]">
            <VerticalAlignBottomOutlined />
            <EditOutlined />
            <MenuOutlined />
          </div>
        </div>
      </div>
    </div>
  );
};

const ContentArea = (props: Props) => {
  const {
    widgets,
    addWidget,
    copyWidget,
    delWidget,
    editWidget,
    isSortMode,
    moveWidgetPosition,
    moveWidgetToColumnEdge,
    moveWidgetToPageModal,
    onSortModeStart,
  } = props;
  const [draggingWidgetId, setDraggingWidgetId] = useState<Widget['id'] | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [bookmarkDragWidgets, setBookmarkDragWidgets] = useState<Page['widgets'] | null>(null);
  const itemRefs = useRef(new Map<Widget['id'], HTMLDivElement>());
  const visualRefs = useRef(new Map<Widget['id'], HTMLDivElement>());
  const previousItemRectsRef = useRef(new Map<Widget['id'], Pick<DOMRect, 'left' | 'top'>>());
  const animationFrameIdsRef = useRef<number[]>([]);
  const bookmarkDragWidgetsRef = useRef<Page['widgets'] | null>(null);
  const displayWidgets = bookmarkDragWidgets ?? widgets;

  const snapshotItemRects = useCallback(() => {
    const rects = new Map<Widget['id'], Pick<DOMRect, 'left' | 'top'>>();

    itemRefs.current.forEach((node, widgetId) => {
      const { left, top } = node.getBoundingClientRect();
      rects.set(widgetId, { left, top });
    });

    previousItemRectsRef.current = rects;
  }, []);

  const handleDragStart = useCallback(
    (widgetId: Widget['id']) => {
      onSortModeStart();
      setDraggingWidgetId(widgetId);
      setDropPreview(null);
    },
    [onSortModeStart],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingWidgetId(null);
    setDropPreview(null);
  }, []);

  const handleDragHover = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => {
      if (sourceId === targetId) return;

      snapshotItemRects();
      moveWidgetPosition(sourceId, targetId, insertPosition);

      setDropPreview((preview) => {
        if (
          preview?.sourceId === sourceId &&
          preview.targetId === targetId &&
          preview.insertPosition === insertPosition
        ) {
          return preview;
        }

        return { sourceId, targetId, insertPosition };
      });
    },
    [moveWidgetPosition, snapshotItemRects],
  );

  const handleBookmarkDragStart = useCallback(() => {
    setBookmarkDragWidgets((current) => {
      if (current) return current;

      const nextWidgets = clone(widgets);
      bookmarkDragWidgetsRef.current = nextWidgets;

      return nextWidgets;
    });
  }, [widgets]);

  const handleBookmarkMove = useCallback(
    (params: MoveBookmarkParams) => {
      setBookmarkDragWidgets((current) => {
        const currentWidgets = current ?? clone(widgets);
        const nextWidgets = moveBookmarkInWidgets(currentWidgets, params);

        bookmarkDragWidgetsRef.current = nextWidgets;

        return nextWidgets;
      });
    },
    [widgets],
  );

  const handleBookmarkDragEnd = useCallback(() => {
    const draftWidgets = bookmarkDragWidgetsRef.current;

    bookmarkDragWidgetsRef.current = null;

    if (!draftWidgets) {
      setBookmarkDragWidgets(null);

      return;
    }

    draftWidgets.forEach((widget) => {
      if (widget.type !== 'bookmarks') return;

      const sourceWidget = widgets.find((item) => item.id === widget.id);
      if (sourceWidget?.type !== 'bookmarks') return;

      const sourceBookmarkIds = sourceWidget.data.bookmarks.map(({ id }) => id).join('|');
      const draftBookmarkIds = widget.data.bookmarks.map(({ id }) => id).join('|');

      if (sourceBookmarkIds === draftBookmarkIds) return;

      editWidget(widget.id, { data: widget.data });
    });

    setBookmarkDragWidgets(null);
  }, [editWidget, widgets]);

  const columns = useMemo(() => {
    const column1 = [];
    const column2 = [];
    const column3 = [];

    for (let i = 0; i < displayWidgets.length; i++) {
      const widget = displayWidgets[i];
      const { col } = widget;

      switch (col) {
        case 0:
          column1.push(widget);
          break;

        case 1:
          column2.push(widget);
          break;

        case 2:
          column3.push(widget);
          break;
      }
    }

    column1.sort((a, b) => a.row - b.row);
    column2.sort((a, b) => a.row - b.row);
    column3.sort((a, b) => a.row - b.row);

    return [column1, column2, column3];
  }, [displayWidgets]);

  const setItemRef = useCallback(
    (widgetId: Widget['id']) => (node: HTMLDivElement | null) => {
      if (node) {
        itemRefs.current.set(widgetId, node);
      } else {
        itemRefs.current.delete(widgetId);
      }
    },
    [],
  );

  const setVisualRef = useCallback(
    (widgetId: Widget['id']) => (node: HTMLDivElement | null) => {
      if (node) {
        visualRefs.current.set(widgetId, node);
      } else {
        visualRefs.current.delete(widgetId);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    animationFrameIdsRef.current.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    animationFrameIdsRef.current = [];

    visualRefs.current.forEach((node) => {
      node.style.transition = 'none';
      node.style.transform = '';
    });

    if (!dropPreview) {
      previousItemRectsRef.current = new Map();

      return;
    }

    itemRefs.current.forEach((node, widgetId) => {
      if (widgetId === draggingWidgetId) return;

      const previousRect = previousItemRectsRef.current.get(widgetId);
      if (!previousRect) return;

      const currentRect = node.getBoundingClientRect();
      const visualNode = visualRefs.current.get(widgetId);
      if (!visualNode) return;

      const deltaX = previousRect.left - currentRect.left;
      const deltaY = previousRect.top - currentRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      visualNode.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;

      visualNode.getBoundingClientRect();

      const frameId = requestAnimationFrame(() => {
        visualNode.style.transition = 'transform 140ms cubic-bezier(0.2, 0, 0, 1)';
        visualNode.style.transform = '';
      });

      animationFrameIdsRef.current.push(frameId);
    });
  }, [draggingWidgetId, dropPreview, widgets]);

  return (
    <>
      <DragLayerPreview widgets={displayWidgets} />
      <Row className="px-[8px] py-[16px] !mx-0" gutter={[16, 16]}>
        {columns.map((column, index) => (
          <Col key={index} span={8}>
            <Row gutter={[16, 8]}>
              {column.map(({ id, type, name, data }) => {
                const isDropTarget = dropPreview?.targetId === id;
                const isDraggingWidget = dropPreview && draggingWidgetId === id;
                const sortContextMenu: MenuProps = {
                  items: sortContextMenuItems,
                  onClick: ({ domEvent, key }) => {
                    domEvent.preventDefault();
                    domEvent.stopPropagation();
                    moveWidgetToColumnEdge(id, key as WidgetColumnEdgePosition);
                  },
                };
                const widgetNode = (
                  <div>
                    <DraggableWidget
                      widgetId={id}
                      onDragEnd={handleDragEnd}
                      onDragHover={handleDragHover}
                      onDragStart={handleDragStart}
                    >
                      {({ containerRef, isDragging, onTitleMouseDown, titleRef }) => (
                        <div ref={containerRef}>
                          <div ref={setVisualRef(id)} className={classNames({ [styles.widgetVisual]: isDragging })}>
                            {type === 'bookmarks' && (
                              <Bookmark
                                copyWidget={copyWidget}
                                data={data}
                                delWidget={delWidget}
                                editWidget={editWidget}
                                forceCollapsed={isSortMode}
                                id={id}
                                isTitleDragging={isDragging}
                                moveBookmark={handleBookmarkMove}
                                moveWidgetToPageModal={moveWidgetToPageModal}
                                name={name}
                                titleRef={titleRef}
                                onBookmarkDragEnd={handleBookmarkDragEnd}
                                onBookmarkDragStart={handleBookmarkDragStart}
                                onTitleMouseDown={onTitleMouseDown}
                              />
                            )}
                            {type === 'clocks' && 'clocks'}
                          </div>
                        </div>
                      )}
                    </DraggableWidget>
                  </div>
                );

                return (
                  <React.Fragment key={id}>
                    {isDropTarget && dropPreview?.insertPosition === 'before' && <DropPlaceholder />}
                    <Col
                      ref={setItemRef(id)}
                      span={24}
                      style={isDraggingWidget ? { opacity: 0, pointerEvents: 'none', position: 'absolute' } : undefined}
                    >
                      {isSortMode ? (
                        <Dropdown menu={sortContextMenu} trigger={['contextMenu']}>
                          {widgetNode}
                        </Dropdown>
                      ) : (
                        widgetNode
                      )}
                    </Col>
                    {isDropTarget && dropPreview?.insertPosition === 'after' && <DropPlaceholder />}
                  </React.Fragment>
                );
              })}
              <Col span={24}>
                <Button
                  block
                  disabled={isSortMode}
                  type="dashed"
                  onClick={() => {
                    addWidget('bookmarks', index, column.length);
                  }}
                >
                  新增工具
                </Button>
              </Col>
            </Row>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default ContentArea;
