import type { ReactProps } from '@/types/utils';

export type PageCardProps = ReactProps<
  { backgroundColor?: string } & Pick<
    React.DOMAttributes<HTMLDivElement>,
    'onClick' | 'onMouseDown' | 'onMouseUp' | 'onTouchEnd'
  >
>;
