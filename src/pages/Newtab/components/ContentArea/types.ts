import type { Page, Widget } from '@/types';

import type {
  SortModeStartReason,
  SortModeStartResult,
  SortModeWidget,
  WidgetColumnEdgePosition,
  WidgetsHandler,
} from '../../types';

export type Props = {
  isSortMode: boolean;
  moveWidgetToColumn: (widgetId: Widget['id'], targetCol: Widget['col']) => void;
  moveWidgetToColumnEdge: (widgetId: Widget['id'], edgePosition: WidgetColumnEdgePosition) => void;
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  onSortModeStart: (reason?: SortModeStartReason) => SortModeStartResult;
  sortModeWidgets: SortModeWidget[] | null;
  widgets: Page['widgets'];
} & WidgetsHandler;
