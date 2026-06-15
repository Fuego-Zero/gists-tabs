import type { Page } from '@/types';

import type { PagesHandler, SortModeStartReason, SortModeStartResult } from '../../types';

export type Props = {
  activePageId: string;
  onSortModeStart: (reason?: SortModeStartReason) => SortModeStartResult;
  pages: Page[];
  setActivePageId: (id: string) => void;
} & PagesHandler;
