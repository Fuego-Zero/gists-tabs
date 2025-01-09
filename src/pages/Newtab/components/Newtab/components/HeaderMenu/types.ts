import type { Page } from '@/types';

import type { PagesHandler } from '../../hooks/usePagesHandler';

export type Props = {
  activePageId: string;
  pages: Page[];
  setActivePageId: (id: string) => void;
} & PagesHandler;
