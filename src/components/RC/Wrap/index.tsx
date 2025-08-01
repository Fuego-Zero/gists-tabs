import type { CSSProperties } from 'react';
import React, { forwardRef, useMemo } from 'react';

import type { ReactChildren } from '@/types/utils';

type Props = {
  /**
   * 该处name必填是为了方便在dom结构中辨识
   */
  name: string;
  /**
   * 是否渲染DOM节点
   */
  renderDom?: boolean;
} & ReactChildren;

export const Wrap = forwardRef<HTMLElement, Props>((props, ref) => {
  const { children, renderDom, name } = props;

  const style = useMemo(() => {
    const style: CSSProperties = {};

    if (!renderDom) {
      style.display = 'contents';
    } else {
      style.width = '100%';
      style.height = '100%';
    }

    return style;
  }, [renderDom]);

  return (
    <rc-wrap ref={ref} className={'rc.wrap'} style={style} wrap-name={name}>
      {children}
    </rc-wrap>
  );
});
