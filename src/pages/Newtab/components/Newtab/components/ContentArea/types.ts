import type { Page } from '@/types';

import type { WidgetsHandler } from '../../hooks/useWidgetsHandler';

export type Props = {
  widgets: Page['widgets'];
} & WidgetsHandler;
