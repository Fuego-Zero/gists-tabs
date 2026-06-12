import React, { useCallback, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { App, Card, Form, Input, Spin, notification } from 'antd';

import classNames from 'classnames';

import EditCard from './components/EditCard';
import EditDetail from './components/EditDetail';
import ExtraCard from './components/ExtraCard';
import ShowCard from './components/ShowCard';
import { BOOKMARK_DRAG_TYPE } from './dnd';
import useBookmarkHandler from './hooks/useBookmarkHandler';
import useDetailHandler from './hooks/useDetailHandler';

import type { BookmarkDragItem } from './dnd';
import type { BookmarkProps } from './types';

const Bookmark = (props: BookmarkProps) => {
  const {
    containerRef,
    id,
    name,
    data,
    delWidget,
    copyWidget,
    dragHandleRef,
    editWidget,
    forceCollapsed,
    isBookmarkDragging,
    isTitleDragging,
    moveBookmark,
    moveWidgetToPageModal,
    onBookmarkDragEnd,
    onBookmarkDragStart,
    onTitleMouseDown,
  } = props;
  const {
    message,
    modal: { confirm },
  } = App.useApp();

  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
  }, [form, isEditMode]);

  async function onSave() {
    try {
      setLoading(true);
      const fields = await form.validateFields();
      editWidget(id, { name: fields.name, data: { ...data, bookmarks: fields.bookmarks } });
      setIsEditMode(false);
      message.success('保存成功');
    } catch (error) {
      const { errorFields }: { errorFields: { errors: string[] }[] } = error as any;

      errorFields.forEach(({ errors: [description] }) => {
        notification.error({
          message: '保存失败',
          description,
        });
      });

      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const { isOpen, selectBookmark, unselectBookmark, selectedBookmark } = useDetailHandler(data);
  const { addBookmark, copyBookmark, deleteBookmark, updateBookmark } = useBookmarkHandler({
    editWidget,
    id,
    data,
    form,
    unselectBookmark,
    setLoading,
  });

  const handleExpandToggle = useCallback(() => {
    if (forceCollapsed) return;

    data.expanded = !data.expanded;
    editWidget(id, { data });
  }, [data, editWidget, forceCollapsed, id]);

  const handleTitleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) selection.removeAllRanges();
      handleExpandToggle();
    },
    [handleExpandToggle],
  );

  const effectiveExpanded = !forceCollapsed && data.expanded;
  const showContent = !forceCollapsed && (isEditMode || data.expanded);

  const [, dropBookmark] = useDrop<BookmarkDragItem>(
    () => ({
      accept: BOOKMARK_DRAG_TYPE,
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;

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
    }),
    [data.bookmarks, id, moveBookmark, onBookmarkDragEnd],
  );

  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      dropBookmark(node);

      if (typeof containerRef === 'function') {
        containerRef(node);
      } else if (containerRef) {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [containerRef, dropBookmark],
  );

  return (
    <>
      <div ref={setContainerRef}>
        <Spin spinning={loading} tip="执行中...">
          <Form form={form} initialValues={{ name, bookmarks: data.bookmarks }}>
            <Card
              extra={
                <ExtraCard
                  copyWidget={() => {
                    copyWidget(id);
                  }}
                  delWidget={() => {
                    confirm({
                      title: '您确定要删除吗?',
                      icon: <ExclamationCircleFilled />,
                      content: '删除后所有数据都会消失',
                      okType: 'danger',
                      async onOk() {
                        delWidget(id);
                        message.success('删除成功');
                      },
                    });
                  }}
                  moveWidgetToPageModal={() => {
                    moveWidgetToPageModal(id);
                  }}
                  switchMode={() => {
                    setIsEditMode((value) => !value);
                  }}
                  actionDisabled={forceCollapsed}
                  expanded={effectiveExpanded}
                  toggleDisabled={forceCollapsed}
                  toggleExpand={handleExpandToggle}
                />
              }
              title={
                isEditMode ? (
                  <div className="mr-[5px]">
                    <Form.Item noStyle name="name">
                      <Input autoComplete="off" placeholder="请输入名称" />
                    </Form.Item>
                  </div>
                ) : (
                  <div
                    ref={dragHandleRef}
                    className={classNames(
                      'mx-[-8px] my-[-4px] rounded-[6px] px-[8px] py-[4px] transition-colors duration-150 select-none',
                      {
                        'cursor-grab active:cursor-grabbing': dragHandleRef,
                        'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-[rgba(0,0,0,0.08)]': isTitleDragging,
                      },
                    )}
                    onDoubleClick={handleTitleDoubleClick}
                    onMouseDown={onTitleMouseDown}
                  >
                    {name}
                  </div>
                )
              }
              size="small"
            >
              {showContent && (
                <>
                  {isEditMode ? (
                    <EditCard addBookmark={addBookmark} selectBookmark={selectBookmark} onSave={onSave} />
                  ) : (
                    <ShowCard
                      copyBookmark={copyBookmark}
                      data={data}
                      deleteBookmark={deleteBookmark}
                      id={id}
                      isBookmarkDragging={isBookmarkDragging}
                      moveBookmark={moveBookmark}
                      onBookmarkDragEnd={onBookmarkDragEnd}
                      onBookmarkDragStart={onBookmarkDragStart}
                    />
                  )}
                </>
              )}
            </Card>
          </Form>
        </Spin>
      </div>
      <EditDetail
        copyBookmark={copyBookmark}
        data={selectedBookmark}
        deleteBookmark={deleteBookmark}
        isOpen={isOpen}
        updateBookmark={updateBookmark}
        onClose={unselectBookmark}
      />
    </>
  );
};

const isEqualInSortMode = (prevProps: BookmarkProps, nextProps: BookmarkProps) => {
  if (!prevProps.forceCollapsed || !nextProps.forceCollapsed) return false;

  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.isTitleDragging === nextProps.isTitleDragging &&
    prevProps.onTitleMouseDown === nextProps.onTitleMouseDown &&
    prevProps.dragHandleRef === nextProps.dragHandleRef
  );
};

export default React.memo(Bookmark, isEqualInSortMode);
