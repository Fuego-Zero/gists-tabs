import React, { useMemo } from 'react';

import { Layout } from 'antd';

import withTheme from '@/theme/withTheme';

import ContentArea from './components/ContentArea';
import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import useGistsTabs from './hooks/useGistsTabs';
import usePagesHandler from './hooks/usePagesHandler';
import useWidgetsHandler from './hooks/useWidgetsHandler';

import type { Page } from '@/types';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistTabs);
  const { widgets, ...widgetsHandler } = useWidgetsHandler(gistsTabs, setGistTabs, activePageId);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);

  return (
    <Layout className="min-h-[100vh]">
      <Header className="sticky top-0 z-10 w-full flex items-center">
        <HeaderMenu {...pagesHandler} activePageId={activePageId} pages={pages} setActivePageId={setActivePageId} />
      </Header>
      <Content className="p-[16px] min-h-full">
        <ContentArea {...widgetsHandler} widgets={widgets} />
      </Content>
    </Layout>
  );
};

export default withTheme(Newtab);
