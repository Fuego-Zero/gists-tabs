import type { Page, Widget } from '@/types';

import type { WidgetColumnEdgePosition, WidgetsHandler } from '../../types';

export type Props = {
  isSortMode: boolean;
  moveWidgetToColumnEdge: (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => void;
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  onSortModeStart: () => void;
  widgets: Page['widgets'];
} & WidgetsHandler;
