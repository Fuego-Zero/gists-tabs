import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Col, Dropdown, Row, Space } from 'antd';
import React from 'react';

import { t } from '@/i18n/translate';

import type { Widget } from '@/types';

import type { SortModeWidget, WidgetInsertPosition, WidgetsHandler } from '../../../../types';
import type { MoveBookmarkParams } from '../../../../utils/bookmarkPosition';
import type { WidgetDropPreview } from '../../hooks/useWidgetSortDnd';
import Bookmark from '../Bookmark';
import ClockCard from '../clock/ClockCard';
import DraggableWidget from '../DraggableWidget';
import DropPlaceholder from '../DropPlaceholder';
import EmptyColumnDropZone from '../EmptyColumnDropZone';
import SortModeCard from '../SortModeCard';

interface BookmarkDraftHandlers {
  isDragging: boolean;
  moveBookmark: (params: MoveBookmarkParams) => void;
  onDragEnd: () => void;
  onDragStart: () => void;
}

interface SortDndHandlers {
  draggingWidgetId: Widget['id'] | null;
  dropPreview: WidgetDropPreview | null;
  onDragEnd: () => void;
  onDragHover: (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => void;
  onDragStart: (widgetId: Widget['id']) => void;
  onEmptyColumnHover: (sourceId: Widget['id'], targetCol: Widget['col']) => void;
  onOpenContextMenu: (event: React.MouseEvent<HTMLDivElement>, widgetId: Widget['id']) => void;
  setItemRef: (widgetId: Widget['id']) => (node: HTMLDivElement | null) => void;
}

type Props = {
  bookmarkDraft: BookmarkDraftHandlers;
  columns: SortModeWidget[][];
  isSortMode: boolean;
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  sortDnd: SortDndHandlers;
} & Pick<WidgetsHandler, 'addWidget' | 'copyWidget' | 'delWidget' | 'editWidget'>;

const isBookmarkWidget = (widget: SortModeWidget): widget is Extract<Widget, { type: 'bookmarks' }> =>
  widget.type === 'bookmarks';

const isClockWidget = (widget: SortModeWidget): widget is Extract<Widget, { type: 'clocks' }> =>
  widget.type === 'clocks';

const WidgetGrid = (props: Props) => {
  const {
    addWidget,
    bookmarkDraft,
    columns,
    copyWidget,
    delWidget,
    editWidget,
    isSortMode,
    moveWidgetToPageModal,
    sortDnd,
  } = props;

  return (
    <Row className="px-[8px] py-[16px] !mx-0" gutter={[16, 16]}>
      {columns.map((column, index) => (
        <Col key={index} span={8}>
          <Row gutter={[16, 8]}>
            {column.map((widget) => {
              const { id, name } = widget;
              const isDropTarget = sortDnd.dropPreview?.targetId === id;
              const isDraggingWidget = Boolean(sortDnd.dropPreview && sortDnd.draggingWidgetId === id);
              // 被拖拽的源卡片在列表里占位但不显示，由自定义预览负责跟随鼠标。
              const dragSourceStyle = isDraggingWidget
                ? { opacity: 0, pointerEvents: 'none' as const, position: 'absolute' as const }
                : undefined;
              // DraggableWidget 只提供拖拽能力；普通模式和 sort mode 的视觉由这里统一切换。
              const widgetNode = (
                <div>
                  <DraggableWidget
                    hideSourcePreviewOnDragStart={!isSortMode}
                    previewTitle={name}
                    widgetId={id}
                    onDragEnd={sortDnd.onDragEnd}
                    onDragHover={sortDnd.onDragHover}
                    onDragStart={sortDnd.onDragStart}
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
                                sortDnd.onOpenContextMenu(event, id);
                              }}
                              onDragMouseDown={onTitleMouseDown}
                            />
                          ) : (
                            <>
                              {/* 未来新增类 Bookmark 组件时，只需要在普通模式分支扩展对应渲染。 */}
                              {isBookmarkWidget(widget) && (
                                <Bookmark
                                  copyWidget={copyWidget}
                                  data={widget.data}
                                  delWidget={delWidget}
                                  dragHandleRef={dragHandleRef}
                                  editWidget={editWidget}
                                  id={id}
                                  isBookmarkDragging={bookmarkDraft.isDragging}
                                  isTitleDragging={isDragging}
                                  moveBookmark={bookmarkDraft.moveBookmark}
                                  moveWidgetToPageModal={moveWidgetToPageModal}
                                  name={name}
                                  onBookmarkDragEnd={bookmarkDraft.onDragEnd}
                                  onBookmarkDragStart={bookmarkDraft.onDragStart}
                                  onTitleMouseDown={onTitleMouseDown}
                                />
                              )}
                              {isClockWidget(widget) && (
                                <ClockCard
                                  copyWidget={copyWidget}
                                  data={widget.data}
                                  delWidget={delWidget}
                                  dragHandleRef={dragHandleRef}
                                  editWidget={editWidget}
                                  id={id}
                                  isTitleDragging={isDragging}
                                  moveWidgetToPageModal={moveWidgetToPageModal}
                                  name={name}
                                  onTitleMouseDown={onTitleMouseDown}
                                />
                              )}
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
                  {isDropTarget && sortDnd.dropPreview?.insertPosition === 'before' && <DropPlaceholder />}
                  <Col ref={isSortMode ? sortDnd.setItemRef(id) : undefined} span={24} style={dragSourceStyle}>
                    {widgetNode}
                  </Col>
                  {isDropTarget && sortDnd.dropPreview?.insertPosition === 'after' && <DropPlaceholder />}
                </React.Fragment>
              );
            })}
            {isSortMode && column.length === 0 && (
              <Col span={24}>
                {/* 空列需要预留承接区，否则跨列拖拽无法进入没有卡片的列。 */}
                <EmptyColumnDropZone col={index} onHover={sortDnd.onEmptyColumnHover} />
              </Col>
            )}
            {!isSortMode && (
              <Col span={24}>
                <Space.Compact block>
                  <Button
                    style={{ flex: 1 }}
                    type="dashed"
                    onClick={() => {
                      addWidget('bookmarks', index, column.length);
                    }}
                  >
                    {t('newWidget')}
                  </Button>
                  <Dropdown
                    menu={{
                      items: [{ key: 'clocks', label: t('newClock') }],
                      onClick: () => {
                        addWidget('clocks', index, column.length);
                      },
                    }}
                    placement="bottomRight"
                    trigger={['hover']}
                  >
                    <Button aria-label={t('newClock')} icon={<EllipsisOutlined />} type="dashed" />
                  </Dropdown>
                </Space.Compact>
              </Col>
            )}
          </Row>
        </Col>
      ))}
    </Row>
  );
};

export default React.memo(WidgetGrid);
