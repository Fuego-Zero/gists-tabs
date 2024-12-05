import React, { useMemo } from 'react';

import { DatePicker, Layout } from 'antd';

import { MainProvider } from '@/context/MainContext';
import withTheme from '@/theme/withTheme';

import HeaderMenu from './components/HeaderMenu';
import useActivePage from './hooks/useActivePage';
import useGistsTabs from './hooks/useGistsTabs';
import usePagesHandler from './hooks/usePagesHandler';

import type { Page } from '@/types';

import './index.scss';

const { Header, Content } = Layout;

const Newtab = () => {
  const [gistsTabs, setGistTabs] = useGistsTabs();
  const [activePageId, setActivePageId] = useActivePage(gistsTabs);
  const pagesHandler = usePagesHandler(gistsTabs, setGistTabs);
  const pages = useMemo<Page[]>(() => gistsTabs.pages, [gistsTabs]);

  return (
    <MainProvider>
      <Layout>
        <Header className="sticky top-0 z-10 w-full flex items-center">
          <HeaderMenu {...pagesHandler} activePageId={activePageId} pages={pages} setActivePageId={setActivePageId} />
        </Header>
        <Content>
          <div className="App text-red-600 h-[100vh]">
            <DatePicker />
          </div>
        </Content>
      </Layout>
    </MainProvider>
  );
};

export default withTheme(Newtab);
