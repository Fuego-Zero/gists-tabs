/**
 * 提取数组元素类型
 */
export type InferArrayItem<T> = T extends Array<infer P> ? P : never;

/**
 * 部分属性可选
 */
export type PartialOption<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/**
 * 部分属性必选
 */
export type RequiredOption<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
/**
 * 唯一属性必选，其他可选
 */
export type RequiredOptionOnly<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
/**
 * 属性二选一
 */
export type EitherOr<
  O extends {
    [name: string]: any;
  },
  L extends keyof O,
  R extends keyof O,
> = OneOfOption<O, L | R>;

/**
 * 属性多选一
 */
export type OneOfOption<T, P extends keyof T> = {
  [K in keyof T]-?: K extends P ? Omit<T, P> & Partial<Record<Exclude<P, K>, never>> & Record<K, T[K]> : never;
}[keyof T];

/**
 * 部分属性转换
 *
 * @description 保留原对象属性修饰符
 */
export type TransformOption<O, P extends keyof O, T> = {
  [K in keyof Pick<O, P>]: T;
} & Omit<O, P>;

/**
 * 深度可选属性
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};
