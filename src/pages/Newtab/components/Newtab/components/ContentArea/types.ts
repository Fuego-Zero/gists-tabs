import type { Page } from '@/types';

import type { WidgetsHandler } from '../../types';

export type Props = {
  widgets: Page['widgets'];
} & WidgetsHandler;
