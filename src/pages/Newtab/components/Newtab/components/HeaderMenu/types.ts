import type { Page } from '@/types';

export type Props = {
  activePageId: string;
  pages: Page[];
  setActivePageId: (id: string) => void;
};
