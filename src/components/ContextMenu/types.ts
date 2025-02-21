import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import type { ReactProps } from '@/types/utils';
import type { EventEmitter } from '@/utils/EventEmitter';

export type ContextMenuInstance = {
  app: Root;
  destroy: Function;
  el: HTMLDivElement;
};

export type ContextMenuItem<T> = {
  disabled?: boolean;
  icon?: ReactNode;
  title: string;
  value: T;
};

export type ContextMenuItems<T> = ContextMenuItem<T>[];

export type Instance = ContextMenuInstance | null;

export type OnSelect<T> = (value: ContextMenuItem<T>['value'], event: MouseEvent) => void;
export type OnCancel = () => void;
export type OnChoose = () => void;

type Handler<T> = {
  /**
   * 取消
   */
  onCancel?: OnCancel;
  /**
   * 进入选择模式
   */
  onChoose?: OnChoose;
  /**
   * 选择成功
   */
  onSelect?: OnSelect<T>;
};

type CommonProps<T> = {
  items?: ContextMenuItems<T>;
  /**
   * zIndex 高度
   *
   * @default 1000
   */
  zIndex?: number;
} & Handler<T>;

export type UseContextMenuParams<T> = {
  el?: HTMLElement | Window;
} & Omit<CommonProps<T>, 'children'>;

export type ContextMenuProps<T> = ReactProps<
  {
    /**
     * 是否开启 click
     *
     * @default false
     */
    click?: boolean;
    /**
     * 是否开启 contextmenu
     *
     * @default true
     */
    contextmenu?: boolean;
    /**
     * 是否开启 hover
     *
     * @default false
     */
    hover?: boolean;
  } & CommonProps<T>
>;

export type MenuEventHandler<T> = {
  cancel: OnCancel;
  destroy: () => void;
  select: (params: { event: MouseEvent; value: ContextMenuItem<T>['value'] }) => void;
};

export type MenuBoxProps<T> = {
  emitter: EventEmitter<MenuEventHandler<T>>;
  items: ContextMenuItems<T>;
  left: number;
  top: number;
};
