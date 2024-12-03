import React, { useMemo } from 'react';

import { DatePicker, Layout } from 'antd';

import data from '@/data/data.json';
import withTheme from '@/theme/withTheme';

import HeaderMenu from './components/HeaderMenu';
import useActivePageHook from './hooks/useActivePageHook';

import type { Page } from '@/types';

import './index.scss';

const { Header, Content } = Layout;

const Newtab = () => {
  const [activePageId, setActivePageId] = useActivePageHook();

  const pages = useMemo<Page[]>(() => data.pages, []);

  return (
    <Layout>
      <Header className="sticky top-0 z-10 w-full flex items-center">
        <HeaderMenu activePageId={activePageId} pages={pages} setActivePageId={setActivePageId} />
      </Header>
      <Content>
        <div className="App text-red-600 h-[100vh]">
          <DatePicker />
        </div>
      </Content>
    </Layout>
  );
};

export default withTheme(Newtab);
