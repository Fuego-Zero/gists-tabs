import type { Page } from '@/types';

import type { PagesHandler } from '../../types';

export type Props = {
  activePageId: string;
  onSortModeStart: () => void;
  pages: Page[];
  setActivePageId: (id: string) => void;
} & PagesHandler;
