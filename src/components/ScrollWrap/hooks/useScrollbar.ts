import { useState } from 'react';

export default function useScrollbar() {
  const [isShowScrollbarY, setIsShowScrollbarY] = useState(false);
  const [isShowScrollbarX, setIsShowScrollbarX] = useState(false);

  function calcShowBar(el: Element) {
    const { clientHeight, scrollHeight, clientWidth, scrollWidth } = el;
    setIsShowScrollbarX(clientWidth !== scrollWidth);
    setIsShowScrollbarY(clientHeight !== scrollHeight);
  }

  return {
    isShowScrollbarX,
    isShowScrollbarY,
    calcShowBar,
  };
}
