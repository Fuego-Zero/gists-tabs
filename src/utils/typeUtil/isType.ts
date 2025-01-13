type ObjectType =
  | 'Array'
  | 'BigInt'
  | 'Blob'
  | 'Boolean'
  | 'Date'
  | 'Error'
  | 'File'
  | 'Function'
  | 'Map'
  | 'Number'
  | 'Object'
  | 'RegExp'
  | 'Set'
  | 'String'
  | 'Symbol'
  | 'WeakMap'
  | 'WeakSet'
  | 'null'
  | 'undefined';

const TYPE: Record<string, ObjectType> = {
  '[object File]': 'File',
  '[object Blob]': 'Blob',
  '[object Symbol]': 'Symbol',
  '[object BigInt]': 'BigInt',
  '[object Undefined]': 'undefined',
  '[object Null]': 'null',
  '[object Boolean]': 'Boolean',
  '[object Number]': 'Number',
  '[object String]': 'String',
  '[object Function]': 'Function',
  '[object Array]': 'Array',
  '[object Date]': 'Date',
  '[object RegExp]': 'RegExp',
  '[object Object]': 'Object',
  '[object Error]': 'Error',
  '[object Map]': 'Map',
  '[object Set]': 'Set',
  '[object WeakMap]': 'WeakMap',
  '[object WeakSet]': 'WeakSet',
};

/**
 * 获取对象数据类型
 */
export function getType(value: any) {
  return TYPE[Object.prototype.toString.call(value)];
}

/**
 * 判断对象数据类型
 */
export function isType(value: any, type: ObjectType): boolean {
  return TYPE[Object.prototype.toString.call(value)] === type;
}

export function isString(value: any): value is string {
  return isType(value, 'String');
}

export function isObject<T extends Record<any, any> = Record<any, any>>(value: any): value is T {
  return isType(value, 'Object');
}

export function isArray<T>(value: any): value is Array<T> {
  return isType(value, 'Array');
}

export function isBoolean(value: any): value is boolean {
  return isType(value, 'Boolean');
}

export function isNumber(value: any): value is number {
  return isType(value, 'Number');
}

export function isFloat(value: any): value is number {
  return isNumber(value) && value % 1 !== 0;
}

export function isFunction<T extends Function = Function>(value: any): value is T {
  return isType(value, 'Function');
}

export function isFile(value: any): value is File {
  return isType(value, 'File');
}

export function isBlob(value: any): value is Blob {
  return isType(value, 'Blob');
}

export function isSymbol(value: any): value is Symbol {
  return isType(value, 'Symbol');
}

export function isBigInt(value: any): value is BigInt {
  return isType(value, 'BigInt');
}

export function isUndefined(value: any): value is undefined {
  return isType(value, 'undefined');
}

export function isNull(value: any): value is null {
  return isType(value, 'null');
}

export function isRegExp(value: any): value is RegExp {
  return isType(value, 'RegExp');
}

export function isError(value: any): value is Error {
  return isType(value, 'Error');
}

export function isMap<K, V>(value: any): value is Map<K, V> {
  return isType(value, 'Map');
}

export function isSet<T>(value: any): value is Set<T> {
  return isType(value, 'Set');
}

export function isWeakMap<K extends WeakKey, V>(value: any): value is WeakMap<K, V> {
  return isType(value, 'WeakMap');
}

export function isWeakSet<T extends WeakKey>(value: any): value is WeakSet<T> {
  return isType(value, 'WeakSet');
}
