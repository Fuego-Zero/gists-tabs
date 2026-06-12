import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { App, Button, Form, Layout, Modal, Select, Space } from 'antd';

import ScrollWrap from '@/components/ScrollWrap';
import useGistsTabs from '@/hooks/useGistsTabs';
import withTheme from '@/theme/withTheme';

import ContentArea from './components/ContentArea';
import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import usePagesHandler from './hooks/usePagesHandler';
import useWidgetsHandler from './hooks/useWidgetsHandler';
import {
  createSortModeWidgets,
  moveWidgetPositionInList,
  moveWidgetToColumnEdgeInList,
  moveWidgetToColumnInList,
} from './utils/widgetPosition';

import type { Page, Widget } from '@/types';

import type {
  SortModeStartReason,
  SortModeStartResult,
  SortModeWidget,
  WidgetColumnEdgePosition,
  WidgetInsertPosition,
} from './types';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistsTabs);
  const { widgets, ...widgetsHandler } = useWidgetsHandler(gistsTabs, setGistsTabs, activePageId);
  // sortModeWidgets 是排序模式的轻量草稿，只保存位置字段；用户点击“保存”前不写回真实 widgets。
  const [sortModeWidgets, setSortModeWidgets] = useState<SortModeWidget[] | null>(null);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);
  const isSortMode = Boolean(sortModeWidgets);

  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm();

  const startSortMode = useCallback(
    (reason: SortModeStartReason = 'manual'): SortModeStartResult => {
      const startedAt = performance.now();

      // 拖拽触发排序时可能已经处于 sort mode，直接复用草稿，避免重复创建导致首帧卡顿。
      if (sortModeWidgets) {
        return {
          alreadySortMode: true,
          createDraftMs: 0,
          reason,
          syncMs: performance.now() - startedAt,
          widgetCount: sortModeWidgets.length,
        };
      }

      const createDraftStartedAt = performance.now();
      // 只克隆排序需要的字段，避免 Bookmark 大数据参与 sort mode 渲染。
      const nextSortModeWidgets = createSortModeWidgets(widgets);
      const createDraftMs = performance.now() - createDraftStartedAt;

      setSortModeWidgets(nextSortModeWidgets);

      return {
        alreadySortMode: false,
        createDraftMs,
        reason,
        syncMs: performance.now() - startedAt,
        widgetCount: nextSortModeWidgets.length,
      };
    },
    [sortModeWidgets, widgets],
  );

  const moveSortWidgetPosition = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => {
      // 排序过程只改草稿，退出可无损丢弃；保存时才同步到外部数据。
      setSortModeWidgets((current) =>
        moveWidgetPositionInList(current ?? createSortModeWidgets(widgets), sourceId, targetId, insertPosition),
      );
    },
    [widgets],
  );

  const moveSortWidgetToColumnEdge = useCallback(
    (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => {
      setSortModeWidgets((current) =>
        moveWidgetToColumnEdgeInList(current ?? createSortModeWidgets(widgets), widgetId, edgePosition),
      );
    },
    [widgets],
  );

  const moveSortWidgetToColumn = useCallback(
    (widgetId: Widget['id'], targetCol: Widget['col']) => {
      setSortModeWidgets((current) =>
        moveWidgetToColumnInList(current ?? createSortModeWidgets(widgets), widgetId, targetCol),
      );
    },
    [widgets],
  );

  const exitSortMode = useCallback(() => {
    setSortModeWidgets(null);
  }, []);

  const saveSortMode = useCallback(() => {
    if (!sortModeWidgets) return;

    // 真实 widget 数据只需要更新 col/row，避免覆盖排序期间可能变化的业务 data。
    widgetsHandler.saveWidgetPositions(sortModeWidgets.map(({ col, id, row }) => ({ col, id, row })));
    setSortModeWidgets(null);
    message.success('排序已保存');
  }, [message, sortModeWidgets, widgetsHandler]);

  function moveWidgetToPageModal(widgetId: Widget['id']) {
    const options = pages.map((page) => ({ value: page.id, label: <span>{page.name}</span> }));

    // 默认选中当前页，用户可直接确认或切到其他页。
    form.setFieldsValue({ pageId: activePageId });

    modal.confirm({
      destroyOnClose: true,
      title: '选择新页面',
      icon: null,
      content: (
        <Form form={form} layout="vertical" name="form">
          <Form.Item name="pageId">
            <Select options={options} />
          </Form.Item>
        </Form>
      ),
      onOk: () => {
        const targetPageId = form.getFieldValue('pageId');
        widgetsHandler.moveWidgetToPage(widgetId, targetPageId);
      },
    });
  }

  return (
    <Layout className="h-[100vh]">
      <Header className="sticky top-0 z-10 w-full flex items-center">
        {isSortMode ? (
          <Space className="ml-auto">
            <Button type="primary" onClick={saveSortMode}>
              保存
            </Button>
            <Button ghost onClick={exitSortMode}>
              退出
            </Button>
          </Space>
        ) : (
          <HeaderMenu
            {...pagesHandler}
            activePageId={activePageId}
            pages={pages}
            setActivePageId={setActivePageId}
            onSortModeStart={startSortMode}
          />
        )}
      </Header>
      <Content className="min-h-0 flex-1">
        <ScrollWrap>
          <DndProvider backend={HTML5Backend}>
            <ContentArea
              {...widgetsHandler}
              isSortMode={isSortMode}
              moveWidgetPosition={moveSortWidgetPosition}
              moveWidgetToColumn={moveSortWidgetToColumn}
              moveWidgetToColumnEdge={moveSortWidgetToColumnEdge}
              moveWidgetToPageModal={moveWidgetToPageModal}
              sortModeWidgets={sortModeWidgets}
              widgets={widgets}
              onSortModeStart={startSortMode}
            />
          </DndProvider>
        </ScrollWrap>
      </Content>
      {contextHolder}
    </Layout>
  );
};

export default withTheme(Newtab);
