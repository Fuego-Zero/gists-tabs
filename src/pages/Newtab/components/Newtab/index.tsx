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
  const [sortModeWidgets, setSortModeWidgets] = useState<SortModeWidget[] | null>(null);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);
  const isSortMode = Boolean(sortModeWidgets);

  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm();

  const startSortMode = useCallback(
    (reason: SortModeStartReason = 'manual'): SortModeStartResult => {
      const startedAt = performance.now();

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

    widgetsHandler.saveWidgetPositions(sortModeWidgets.map(({ col, id, row }) => ({ col, id, row })));
    setSortModeWidgets(null);
    message.success('排序已保存');
  }, [message, sortModeWidgets, widgetsHandler]);

  function moveWidgetToPageModal(widgetId: Widget['id']) {
    const options = pages.map((page) => ({ value: page.id, label: <span>{page.name}</span> }));

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
