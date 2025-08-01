import type { Page, Widget } from '@/types';

import type { WidgetsHandler } from '../../types';

export type Props = {
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  widgets: Page['widgets'];
} & WidgetsHandler;
