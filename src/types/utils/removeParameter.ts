type RemoveType<T, E> = T extends [arg1: infer Head, ...args2: infer Tail]
  ? E extends Head
    ? [...RemoveType<Tail, E>]
    : [Head, ...RemoveType<Tail, E>]
  : [];

/**
 * 删除传入函数指定类型形参
 *
 * @description 不支持联合类型
 */
export type RemoveParameterByType<Fn extends (...args: any[]) => any, R> = (
  ...args: RemoveType<Parameters<Fn>, R>
) => ReturnType<Fn>;

type RemoveIndex<T extends any[], Index extends number, I extends any[] = []> = T extends [infer Head, ...infer Tail]
  ? I['length'] extends Index
    ? RemoveIndex<Tail, Index, I>
    : RemoveIndex<Tail, Index, [...I, Head]>
  : I;

/**
 * 删除传入函数指定下标形参
 *
 * @description 支持联合类型下标 n1 | n2
 */
export type RemoveParameterByIndex<Fn extends (...args: any) => any, Index extends number> = (
  ...args: [...RemoveIndex<Parameters<Fn>, Index>]
) => ReturnType<Fn>;
