import React, { useMemo } from 'react';

import { Form, Layout, Modal, Select } from 'antd';

import ScrollWrap from '@/components/ScrollWrap';
import useGistsTabs from '@/hooks/useGistsTabs';
import withTheme from '@/theme/withTheme';

import ContentArea from './components/ContentArea';
import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import usePagesHandler from './hooks/usePagesHandler';
import useWidgetsHandler from './hooks/useWidgetsHandler';

import type { Page, Widget } from '@/types';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistsTabs);
  const { widgets, ...widgetsHandler } = useWidgetsHandler(gistsTabs, setGistsTabs, activePageId);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);

  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm();

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
        <HeaderMenu {...pagesHandler} activePageId={activePageId} pages={pages} setActivePageId={setActivePageId} />
      </Header>
      <Content className="min-h-0 flex-1">
        <ScrollWrap>
          <ContentArea {...widgetsHandler} moveWidgetToPageModal={moveWidgetToPageModal} widgets={widgets} />
        </ScrollWrap>
      </Content>
      {contextHolder}
    </Layout>
  );
};

export default withTheme(Newtab);
