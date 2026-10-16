/** 首次异步读取若已被更新的 watch 取代，则不能写回缓存。 */
export function commitSnapshot(
  cache: Map<string, unknown>,
  key: string,
  value: unknown,
  superseded: boolean,
): boolean {
  if (superseded) {return false;}

  cache.set(key, value);
  return true;
}
