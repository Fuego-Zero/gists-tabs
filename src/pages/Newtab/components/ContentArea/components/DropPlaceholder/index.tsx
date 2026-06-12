import React from 'react';

import { Col } from 'antd';

import styles from '../../style.module.scss';

const DropPlaceholder = () => (
  <Col span={24}>
    <div
      className={`${styles.dropPlaceholder} flex h-[52px] items-center rounded-[8px] border-2 border-dashed border-[#1677ff] bg-[#e6f4ff] px-[12px] shadow-[0_0_0_3px_rgba(22,119,255,0.12),inset_0_0_0_1px_rgba(22,119,255,0.2)]`}
    >
      <div className="h-[8px] w-full rounded-full bg-[rgba(22,119,255,0.24)]" />
    </div>
  </Col>
);

export default DropPlaceholder;
