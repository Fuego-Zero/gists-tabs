import React from 'react';
import { createRoot } from 'react-dom/client';

import Popup from '@/pages/Popup/components/Popup';
import { WithTheme } from '@/theme/withTheme';
import '@/styles/tailwind.css';

import './index.scss';

// Chrome 扩展弹窗的 vh 会随内容高度回算，需用屏幕高度设定明确像素值
const popupHeight = Math.min(Math.round(window.screen.availHeight * 0.8), 600);
document.documentElement.style.height = `${popupHeight}px`;
document.body.style.height = `${popupHeight}px`;

const container = document.getElementById('app-container');
if (container) {
  container.style.height = `${popupHeight}px`;
}

const root = createRoot(container!);
root.render(
  <WithTheme>
    <Popup />
  </WithTheme>,
);
