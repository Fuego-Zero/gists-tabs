import React from 'react';

import { Button, Menu } from 'antd';

import type { Props } from './types';

const HeaderMenu = (props: Props) => {
  const { activePageId, setActivePageId, pages } = props;

  const items = pages.map((page) => ({
    key: page.id,
    label: page.name,
  }));

  return (
    <>
      <Menu
        items={items}
        mode="horizontal"
        selectedKeys={[activePageId]}
        style={{ flex: 1, minWidth: 0 }}
        theme="dark"
        onSelect={(value) => {
          setActivePageId(value.key);
        }}
      />
      <div>
        <Button>1</Button>
        <Button>2</Button>
      </div>
    </>
  );
};

export default HeaderMenu;
