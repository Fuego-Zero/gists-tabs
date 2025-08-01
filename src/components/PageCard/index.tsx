import React, { forwardRef, useMemo } from 'react';

import classnames from 'classnames';

import type { PageCardProps } from './types';

const PageCard = forwardRef<HTMLDivElement, PageCardProps>((props, ref) => {
  const {
    backgroundColor = '#fff',
    children,
    onClick,
    className = '',
    style,
    onMouseDown,
    onMouseUp,
    onTouchEnd,
  } = props;

  const innerStyle = useMemo(
    () => ({
      backgroundColor,
      borderRadius: '8px',
      ...style,
    }),
    [backgroundColor, style],
  );

  return (
    <div
      ref={ref}
      className={classnames('PageCard', className)}
      style={innerStyle}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  );
});

export default PageCard;
