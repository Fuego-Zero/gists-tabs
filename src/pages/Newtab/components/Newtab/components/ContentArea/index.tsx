import React, { useMemo } from 'react';

import { Button, Col, Row } from 'antd';

import Bookmark from './components/Bookmark';

import type { Props } from './types';

const ContentArea = (props: Props) => {
  const { widgets, addWidget, ...widgetHandler } = props;

  const columns = useMemo(() => {
    const column1 = [];
    const column2 = [];
    const column3 = [];

    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      const { col } = widget;

      switch (col) {
        case 0:
          column1.push(widget);
          break;

        case 1:
          column2.push(widget);
          break;

        case 2:
          column3.push(widget);
          break;
      }
    }

    column1.sort((a, b) => a.row - b.row);
    column2.sort((a, b) => a.row - b.row);
    column3.sort((a, b) => a.row - b.row);

    return [column1, column2, column3];
  }, [widgets]);

  return (
    <Row gutter={[16, 16]}>
      {columns.map((column, index) => (
        <Col key={index} span={8}>
          <Row gutter={[16, 8]}>
            {column.map(({ id, type, name, data }) => (
              <Col key={id} span={24}>
                {type === 'bookmarks' && <Bookmark {...widgetHandler} data={data} id={id} name={name} />}
                {type === 'clocks' && 'clocks'}
              </Col>
            ))}
            <Col span={24}>
              <Button
                block
                type="dashed"
                onClick={() => {
                  addWidget('bookmarks', index, column.length);
                }}
              >
                新增工具
              </Button>
            </Col>
          </Row>
        </Col>
      ))}
    </Row>
  );
};

export default ContentArea;
