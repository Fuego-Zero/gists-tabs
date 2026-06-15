import React, { useMemo } from 'react';

import DragPreviewLayer from './components/DragPreviewLayer';
import SortModeContextMenu from './components/SortModeContextMenu';
import WidgetGrid from './components/WidgetGrid';
import useBookmarkDragDraft from './hooks/useBookmarkDragDraft';
import useWidgetSortDnd from './hooks/useWidgetSortDnd';

import type { SortModeWidget } from '../../types';
import type { Props } from './types';

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

  const bookmarkDraft = useBookmarkDragDraft({
    saveWidgetsData,
    widgets,
  });

  const displayWidgets = useMemo<SortModeWidget[]>(() => {
    // ContentArea 只决定当前展示哪份 widgets：sort 草稿、Bookmark 拖拽草稿或真实数据。
    if (isSortMode) return sortModeWidgets ?? [];

    return bookmarkDraft.draftWidgets ?? widgets;
  }, [bookmarkDraft.draftWidgets, isSortMode, sortModeWidgets, widgets]);

  const sortDnd = useWidgetSortDnd({
    displayWidgets,
    isSortMode,
    moveWidgetPosition,
    moveWidgetToColumn,
    moveWidgetToColumnEdge,
    onSortModeStart,
  });

  return (
    <>
      <DragPreviewLayer />
      <SortModeContextMenu
        menu={sortDnd.sortContextMenu}
        onClose={sortDnd.closeSortContextMenu}
        onSelect={sortDnd.selectSortContextMenu}
      />
      <WidgetGrid
        bookmarkDraft={{
          isDragging: bookmarkDraft.isDragging,
          moveBookmark: bookmarkDraft.moveBookmark,
          onDragEnd: bookmarkDraft.endDrag,
          onDragStart: bookmarkDraft.startDrag,
        }}
        sortDnd={{
          draggingWidgetId: sortDnd.draggingWidgetId,
          dropPreview: sortDnd.dropPreview,
          onDragEnd: sortDnd.endDrag,
          onDragHover: sortDnd.hoverDrag,
          onDragStart: sortDnd.startDrag,
          onEmptyColumnHover: sortDnd.hoverEmptyColumn,
          onOpenContextMenu: sortDnd.openSortContextMenu,
          setItemRef: sortDnd.setItemRef,
        }}
        addWidget={addWidget}
        columns={sortDnd.columns}
        copyWidget={copyWidget}
        delWidget={delWidget}
        editWidget={editWidget}
        isSortMode={isSortMode}
        moveWidgetToPageModal={moveWidgetToPageModal}
      />
    </>
  );
};

export default ContentArea;
