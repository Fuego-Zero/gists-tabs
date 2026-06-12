import type { Widget } from '@/types';

import type { WidgetInsertPosition } from '../../types';

export const WIDGET_DRAG_TYPE = 'widget';

export type WidgetDragItem = {
  id: Widget['id'];
  lastInsertPosition?: WidgetInsertPosition;
  lastTargetId?: Widget['id'];
  title: string;
  width: number;
};
