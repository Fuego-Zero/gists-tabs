import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Col, Row } from 'antd';

import { clone } from '@/utils';

import { moveBookmarkInWidgets } from '../../utils/bookmarkPosition';
import Bookmark from './components/Bookmark';
import BookmarkDragPreview from './components/Bookmark/components/BookmarkDragPreview';
import DraggableWidget from './components/DraggableWidget';
import DropPlaceholder from './components/DropPlaceholder';
import EmptyColumnDropZone from './components/EmptyColumnDropZone';
import SortModeCard from './components/SortModeCard';
import SortModeContextMenu from './components/SortModeContextMenu';
import WidgetDragPreview from './components/WidgetDragPreview';
import useSortContextMenu from './hooks/useSortContextMenu';
import useSortDndLogger from './hooks/useSortDndLogger';
import useSortModeFlip from './hooks/useSortModeFlip';

import type { Page, Widget } from '@/types';

import type { SortModeWidget, WidgetInsertPosition } from '../../types';
import type { MoveBookmarkParams } from '../../utils/bookmarkPosition';
import type { Props } from './types';

type DropPreview = {
  insertPosition: WidgetInsertPosition;
  sourceId: Widget['id'];
  targetId: Widget['id'];
};

type DragOriginWidget = Pick<SortModeWidget, 'col' | 'id' | 'row'>;

const ContentArea = (props: Props) => {
  const {
    widgets,
    addWidget,
    copyWidget,
    delWidget,
    editWidget,
    isSortMode,
    moveWidgetPosition,
    moveWidgetToColumn,
    moveWidgetToColumnEdge,
    moveWidgetToPageModal,
    onSortModeStart,
    saveWidgetsData,
    sortModeWidgets,
  } = props;
  const [dragOriginWidget, setDragOriginWidget] = useState<DragOriginWidget | null>(null);
  const [draggingWidgetId, setDraggingWidgetId] = useState<Widget['id'] | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [bookmarkDragWidgets, setBookmarkDragWidgets] = useState<Page['widgets'] | null>(null);
  const bookmarkDragBaseWidgetsRef = useRef<Page['widgets'] | null>(null);
  const bookmarkDragWidgetsRef = useRef<Page['widgets'] | null>(null);
  const hoverFrameIdRef = useRef<null | number>(null);
  const pendingHoverRef = useRef<DropPreview | null>(null);
  const displayWidgets = useMemo<SortModeWidget[]>(() => {
    if (isSortMode) return sortModeWidgets ?? [];

    return bookmarkDragWidgets ?? widgets;
  }, [bookmarkDragWidgets, isSortMode, sortModeWidgets, widgets]);

  const renderWidgets = useMemo<SortModeWidget[]>(() => {
    if (!dragOriginWidget || dragOriginWidget.id !== draggingWidgetId) return displayWidgets;

    return displayWidgets.map((widget) =>
      widget.id === dragOriginWidget.id
        ? {
            ...widget,
            col: dragOriginWidget.col,
            row: dragOriginWidget.row,
          }
        : widget,
    );
  }, [displayWidgets, dragOriginWidget, draggingWidgetId]);

  const columns = useMemo(() => {
    const column1: SortModeWidget[] = [];
    const column2: SortModeWidget[] = [];
    const column3: SortModeWidget[] = [];

    for (let i = 0; i < renderWidgets.length; i++) {
      const widget = renderWidgets[i];
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
  }, [renderWidgets]);

  const { beginDrag, recordHover, scheduleDragEndClear } = useSortDndLogger({
    columns,
    displayWidgetCount: displayWidgets.length,
    draggingWidgetId,
    isSortMode,
  });

  const { cancelAnimations, setItemRef, snapshotAffectedItemRects } = useSortModeFlip({
    displayWidgets,
    draggingWidgetId,
    isSortMode,
  });

  const {
    close: closeSortContextMenu,
    menu: sortContextMenu,
    open: openSortContextMenu,
    select: selectSortContextMenu,
  } = useSortContextMenu({
    isSortMode,
    moveWidgetToColumnEdge,
  });

  const handleDragStart = useCallback(
    (widgetId: Widget['id']) => {
      const dragStartRequestedAt = performance.now();
      const originWidget = displayWidgets.find(({ id }) => id === widgetId);
      const startResult = onSortModeStart('drag');

      beginDrag(widgetId, startResult, dragStartRequestedAt);
      setDragOriginWidget(originWidget ? { col: originWidget.col, id: originWidget.id, row: originWidget.row } : null);
      setDraggingWidgetId(widgetId);
      setDropPreview(null);
      closeSortContextMenu();
    },
    [beginDrag, closeSortContextMenu, displayWidgets, onSortModeStart],
  );

  const flushDragHover = useCallback(
    (options?: { animate?: boolean; record?: boolean; showPreview?: boolean }) => {
      const { animate = true, record = true, showPreview = true } = options ?? {};
      const pendingHover = pendingHoverRef.current;

      hoverFrameIdRef.current = null;
      pendingHoverRef.current = null;

      if (!pendingHover) return;

      const { sourceId, targetId, insertPosition } = pendingHover;
      const hoverStartedAt = performance.now();
      const sourceWidget = displayWidgets.find(({ id }) => id === sourceId);
      const targetWidget = displayWidgets.find(({ id }) => id === targetId);

      if (animate && isSortMode) {
        snapshotAffectedItemRects(sourceId, targetId);
      }

      moveWidgetPosition(sourceId, targetId, insertPosition);

      if (showPreview) {
        setDropPreview((preview) => {
          if (
            preview?.sourceId === sourceId &&
            preview.targetId === targetId &&
            preview.insertPosition === insertPosition
          ) {
            return preview;
          }

          return pendingHover;
        });
      }

      if (record) {
        recordHover({
          crossColumn: Boolean(sourceWidget && targetWidget && sourceWidget.col !== targetWidget.col),
          hoverStartedAt,
          insertPosition,
          sourceId,
          syncMs: performance.now() - hoverStartedAt,
          targetId,
        });
      }
    },
    [displayWidgets, isSortMode, moveWidgetPosition, recordHover, snapshotAffectedItemRects],
  );

  const handleDragEnd = useCallback(() => {
    const hasPendingHover = Boolean(pendingHoverRef.current);

    if (hoverFrameIdRef.current !== null) {
      cancelAnimationFrame(hoverFrameIdRef.current);
      hoverFrameIdRef.current = null;
    }

    scheduleDragEndClear({
      clear: () => {
        cancelAnimations();

        if (hasPendingHover) {
          flushDragHover({ animate: false, record: false, showPreview: false });
        }

        setDraggingWidgetId(null);
        setDragOriginWidget(null);
        setDropPreview(null);
      },
      dropPreviewActive: Boolean(dropPreview || hasPendingHover),
    });
  }, [cancelAnimations, dropPreview, flushDragHover, scheduleDragEndClear]);

  const handleDragHover = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => {
      if (sourceId === targetId) return;

      pendingHoverRef.current = { sourceId, targetId, insertPosition };

      if (hoverFrameIdRef.current !== null) return;

      hoverFrameIdRef.current = requestAnimationFrame(() => {
        flushDragHover();
      });
    },
    [flushDragHover],
  );

  const handleEmptyColumnHover = useCallback(
    (sourceId: Widget['id'], targetCol: Widget['col']) => {
      if (!isSortMode) return;

      const sourceWidget = displayWidgets.find(({ id }) => id === sourceId);
      if (!sourceWidget || sourceWidget.col === targetCol) return;

      if (hoverFrameIdRef.current !== null) {
        cancelAnimationFrame(hoverFrameIdRef.current);
        hoverFrameIdRef.current = null;
      }

      pendingHoverRef.current = null;
      cancelAnimations();
      setDropPreview(null);
      moveWidgetToColumn(sourceId, targetCol);
    },
    [cancelAnimations, displayWidgets, isSortMode, moveWidgetToColumn],
  );

  useEffect(
    () => () => {
      if (hoverFrameIdRef.current !== null) {
        cancelAnimationFrame(hoverFrameIdRef.current);
      }
    },
    [],
  );

  const handleBookmarkDragStart = useCallback(() => {
    if (bookmarkDragWidgetsRef.current) return;

    const nextWidgets = clone(widgets);
    bookmarkDragBaseWidgetsRef.current = nextWidgets;
    bookmarkDragWidgetsRef.current = nextWidgets;
    setBookmarkDragWidgets(nextWidgets);
  }, [widgets]);

  const handleBookmarkMove = useCallback(
    (params: MoveBookmarkParams) => {
      const currentWidgets = bookmarkDragWidgetsRef.current ?? clone(widgets);
      const nextWidgets = moveBookmarkInWidgets(currentWidgets, params);

      bookmarkDragWidgetsRef.current = nextWidgets;
      setBookmarkDragWidgets(nextWidgets);
    },
    [widgets],
  );

  const handleBookmarkDragEnd = useCallback(() => {
    const draftWidgets = bookmarkDragWidgetsRef.current;
    const baseWidgets = bookmarkDragBaseWidgetsRef.current ?? widgets;

    bookmarkDragWidgetsRef.current = null;
    bookmarkDragBaseWidgetsRef.current = null;

    if (!draftWidgets) {
      setBookmarkDragWidgets(null);

      return;
    }

    const changedWidgetsData: { data: Widget['data']; id: Widget['id'] }[] = [];

    draftWidgets.forEach((widget) => {
      if (widget.type !== 'bookmarks') return;

      const sourceWidget = baseWidgets.find((item) => item.id === widget.id);
      if (sourceWidget?.type !== 'bookmarks') return;

      const sourceBookmarkIds = sourceWidget.data.bookmarks.map(({ id }) => id).join('|');
      const draftBookmarkIds = widget.data.bookmarks.map(({ id }) => id).join('|');

      if (sourceBookmarkIds === draftBookmarkIds) return;

      changedWidgetsData.push({ id: widget.id, data: widget.data });
    });

    if (changedWidgetsData.length > 0) {
      saveWidgetsData(changedWidgetsData);
    }

    setBookmarkDragWidgets(null);
  }, [saveWidgetsData, widgets]);

  return (
    <>
      <WidgetDragPreview />
      <BookmarkDragPreview />
      <SortModeContextMenu menu={sortContextMenu} onClose={closeSortContextMenu} onSelect={selectSortContextMenu} />
      <Row className="px-[8px] py-[16px] !mx-0" gutter={[16, 16]}>
        {columns.map((column, index) => (
          <Col key={index} span={8}>
            <Row gutter={[16, 8]}>
              {column.map((widget) => {
                const { id, type, name } = widget;
                const isDropTarget = dropPreview?.targetId === id;
                const isDraggingWidget = dropPreview && draggingWidgetId === id;
                const widgetNode = (
                  <div>
                    <DraggableWidget
                      hideSourcePreviewOnDragStart={!isSortMode}
                      previewTitle={name}
                      widgetId={id}
                      onDragEnd={handleDragEnd}
                      onDragHover={handleDragHover}
                      onDragStart={handleDragStart}
                    >
                      {({ containerRef, dragHandleRef, isDragging, isSourcePreviewHidden, onTitleMouseDown }) => (
                        <div ref={containerRef}>
                          <div style={isSourcePreviewHidden && !isSortMode ? { opacity: 0 } : undefined}>
                            {isSortMode ? (
                              <SortModeCard
                                dragHandleRef={dragHandleRef}
                                isTitleDragging={isDragging}
                                name={name}
                                onContextMenu={(event) => {
                                  openSortContextMenu(event, id);
                                }}
                                onDragMouseDown={onTitleMouseDown}
                              />
                            ) : (
                              <>
                                {type === 'bookmarks' && (
                                  <Bookmark
                                    copyWidget={copyWidget}
                                    data={(widget as Extract<Widget, { type: 'bookmarks' }>).data}
                                    delWidget={delWidget}
                                    dragHandleRef={dragHandleRef}
                                    editWidget={editWidget}
                                    id={id}
                                    isBookmarkDragging={Boolean(bookmarkDragWidgets)}
                                    isTitleDragging={isDragging}
                                    moveBookmark={handleBookmarkMove}
                                    moveWidgetToPageModal={moveWidgetToPageModal}
                                    name={name}
                                    onBookmarkDragEnd={handleBookmarkDragEnd}
                                    onBookmarkDragStart={handleBookmarkDragStart}
                                    onTitleMouseDown={onTitleMouseDown}
                                  />
                                )}
                                {type === 'clocks' && 'clocks'}
                              </>
                            )}
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
                      ref={isSortMode ? setItemRef(id) : undefined}
                      span={24}
                      style={isDraggingWidget ? { opacity: 0, pointerEvents: 'none', position: 'absolute' } : undefined}
                    >
                      {widgetNode}
                    </Col>
                    {isDropTarget && dropPreview?.insertPosition === 'after' && <DropPlaceholder />}
                  </React.Fragment>
                );
              })}
              {isSortMode && column.length === 0 && (
                <Col span={24}>
                  <EmptyColumnDropZone col={index as Widget['col']} onHover={handleEmptyColumnHover} />
                </Col>
              )}
              {!isSortMode && (
                <Col span={24}>
                  <Button
                    block
                    type="dashed"
                    onClick={() => {
                      addWidget('bookmarks', index, column.length);
                    }}
                  >
                    新增工具
                  </Button>
                </Col>
              )}
            </Row>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default ContentArea;
