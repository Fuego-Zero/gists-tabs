import type React from 'react';

export type ReactComponent<T = any> = React.ComponentType<T>;
export type ReactForwardRefComponent<F = any, T = any> = React.ForwardRefRenderFunction<F, T>;

/**
 * 获取组件的props类型
 */
export type GetReactComponentProps<T extends ReactComponent> = T extends ReactComponent<infer P> ? P : never;

type GetElementProps<T> = T extends HTMLElement
  ? React.HTMLAttributes<T>
  : {
      [k in keyof T]: T[k];
    };
export type ReactChildren<P extends object | undefined = undefined> = {
  children?: P extends undefined ? React.ReactNode : ((props: P) => React.ReactNode) | React.ReactNode;
};

type ReactPropsOnlyChildren<P extends object | undefined = undefined> = Pick<
  React.HTMLAttributes<HTMLElement>,
  'className' | 'style'
> &
  ReactChildren<P>;

/**
 * 定义 React 组件的 Props
 *
 * @description 默认提供 'className' | 'style' 两个属性，如果使用泛型就会合并类型
 */
export type ReactProps<T extends object = never, P extends object | undefined = undefined> = [T] extends [never]
  ? ReactPropsOnlyChildren
  : GetElementProps<T> & ReactPropsOnlyChildren<P>;

/**
 * 获取通过 forwardRef 函数定义的组件元素类型
 */
export type ForwardRefHTML<T> = T extends React.ForwardRefExoticComponent<React.RefAttributes<infer R>> ? R : never;
