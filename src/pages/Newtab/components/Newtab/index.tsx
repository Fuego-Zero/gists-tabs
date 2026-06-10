import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { App, Button, Form, Layout, Modal, Select, Space } from 'antd';

import ScrollWrap from '@/components/ScrollWrap';
import useGistsTabs from '@/hooks/useGistsTabs';
import withTheme from '@/theme/withTheme';
import { clone } from '@/utils';

import ContentArea from './components/ContentArea';
import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import usePagesHandler from './hooks/usePagesHandler';
import useWidgetsHandler from './hooks/useWidgetsHandler';
import { moveWidgetPositionInList, moveWidgetToColumnEdgeInList } from './utils/widgetPosition';

import type { Page, Widget } from '@/types';

import type { WidgetColumnEdgePosition, WidgetInsertPosition } from './types';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistsTabs);
  const { widgets, ...widgetsHandler } = useWidgetsHandler(gistsTabs, setGistsTabs, activePageId);
  const [sortModeWidgets, setSortModeWidgets] = useState<Page['widgets'] | null>(null);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);
  const visibleWidgets = sortModeWidgets ?? widgets;
  const isSortMode = Boolean(sortModeWidgets);

  const { message } = App.useApp();
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm();

  const startSortMode = useCallback(() => {
    setSortModeWidgets((current) => current ?? clone(widgets));
  }, [widgets]);

  const moveSortWidgetPosition = useCallback(
    (sourceId: Widget['id'], targetId: Widget['id'], insertPosition: WidgetInsertPosition) => {
      setSortModeWidgets((current) => moveWidgetPositionInList(current ?? widgets, sourceId, targetId, insertPosition));
    },
    [widgets],
  );

  const moveSortWidgetToColumnEdge = useCallback(
    (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => {
      setSortModeWidgets((current) => moveWidgetToColumnEdgeInList(current ?? widgets, widgetId, edgePosition));
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
              moveWidgetToColumnEdge={moveSortWidgetToColumnEdge}
              moveWidgetToPageModal={moveWidgetToPageModal}
              widgets={visibleWidgets}
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
