import React from 'react';

import { DatePicker } from 'antd';

import withTheme from '@/theme/withTheme';

import './index.scss';

const Newtab = () => {
  console.log(1);
  return (
    <div className="App text-red-600">
      <DatePicker />
    </div>
  );
};

export default withTheme(Newtab);
