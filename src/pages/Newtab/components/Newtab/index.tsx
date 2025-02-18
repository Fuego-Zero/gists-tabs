import React, { useMemo } from 'react';

import { Layout } from 'antd';

import ScrollWrap from '@/components/ScrollWrap';
import useGistsTabs from '@/hooks/useGistsTabs';
import withTheme from '@/theme/withTheme';

import ContentArea from './components/ContentArea';
import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import usePagesHandler from './hooks/usePagesHandler';
import useWidgetsHandler from './hooks/useWidgetsHandler';

import type { Page } from '@/types';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistsTabs);
  const { widgets, ...widgetsHandler } = useWidgetsHandler(gistsTabs, setGistsTabs, activePageId);

  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);

  return (
    <Layout className="h-[100vh]">
      <Header className="sticky top-0 z-10 w-full flex items-center">
        <HeaderMenu {...pagesHandler} activePageId={activePageId} pages={pages} setActivePageId={setActivePageId} />
      </Header>
      <Content className="min-h-0 flex-1">
        <ScrollWrap>
          <ContentArea {...widgetsHandler} widgets={widgets} />
        </ScrollWrap>
      </Content>
    </Layout>
  );
};

export default withTheme(Newtab);
