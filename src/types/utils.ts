import type React from 'react';

export type ReactComponent<T = any> = React.ComponentType<T>;
export type ReactForwardRefComponent<F = any, T = any> = React.ForwardRefRenderFunction<F, T>;

/**
 * 获取组件的props类型
 */
export type GetReactComponentProps<T extends ReactComponent> = T extends ReactComponent<infer P> ? P : never;

/**
 * 提取数组元素类型
 */
export type InferArrayItem<T> = T extends Array<infer P> ? P : never;
