import type { GistsTabs, Page } from '@/types';
import type { SyncMeta } from '@/types/sync';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntryList(value: unknown, fields: string[]): boolean {
  return Array.isArray(value)
    && value.every((entry) => isObject(entry) && fields.every((field) => typeof entry[field] === 'string'));
}

/** 旧版本（version 0）的小组件数据直接是数组，升级时才包成对象。 */
function widgetEntries(data: unknown, field: string): unknown {
  if (Array.isArray(data)) {return data;}

  return isObject(data) ? data[field] : undefined;
}

function isWidgetData(type: unknown, data: unknown): boolean {
  if (type === 'bookmarks') {return isEntryList(widgetEntries(data, 'bookmarks'), ['id', 'url']);}

  if (type === 'clocks') {return isEntryList(widgetEntries(data, 'clocks'), ['id', 'timezone']);}

  return false;
}

function isWidget(value: unknown): boolean {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.col === 'number'
    && typeof value.row === 'number'
    && (value.name === undefined || typeof value.name === 'string')
    && isWidgetData(value.type, value.data);
}

function isPage(value: unknown): value is Page {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && Array.isArray(value.widgets)
    && value.widgets.every(isWidget);
}

function parseSyncMeta(value: unknown): SyncMeta | undefined {
  if (!isObject(value) || typeof value.revision !== 'string' || !value.revision) {return undefined;}

  return {
    deviceId: typeof value.deviceId === 'string' ? value.deviceId : '',
    revision: value.revision,
    updateAt: typeof value.updateAt === 'number' ? value.updateAt : 0,
  };
}

/**
 * 校验来自云端或导入文件的画布。结构不对返回 null，调用方不得写入本机或推上云端。
 * 最早的版本建 Gist 时只写了 `{ updateAt }`，按空画布处理。
 */
export function parseCanvas(value: unknown): GistsTabs | null {
  if (!isObject(value)) {return null;}

  const updateAt = typeof value.updateAt === 'number' ? value.updateAt : 0;
  const syncMeta = parseSyncMeta(value.syncMeta);
  if (value.pages === undefined) {
    return { pages: [], syncMeta, updateAt, version: 1 };
  }

  if (!Array.isArray(value.pages) || !value.pages.every(isPage)) {return null;}

  return {
    pages: value.pages,
    syncMeta,
    updateAt,
    version: typeof value.version === 'number' ? value.version : 0,
  };
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {return value.map(sortKeys);}

  if (!isObject(value)) {return value;}

  const sorted: JsonObject = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) {sorted[key] = sortKeys(value[key]);}
  }

  return sorted;
}

/** 画布内容的稳定序列化。只看 pages 与 version；syncMeta、updateAt 不代表用户改了什么。 */
export function canvasKey(data: GistsTabs): string {
  return JSON.stringify(sortKeys({ pages: data.pages, version: data.version }));
}

export async function canvasHash(data: GistsTabs): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canvasKey(data)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface PushInput {
  /** 本机上次同步成功时的云端 revision。 */
  anchor: null | string;
  /** 锚点那一版画布的内容哈希。 */
  baseHash: null | string;
  /** 云端有用户内容：不是空画布，也不是自动生成的空首页。 */
  cloudHasContent: boolean;
  cloudHash: string;
  cloudRevision: null | string;
  /** 用户已确认用本机覆盖一次没有 revision 的旧格式云端。 */
  legacyConfirmed: boolean;
  localHash: string;
  /** 本机是自动生成的空首页。 */
  localIsInitial: boolean;
}

export type PushDecision =
  | { kind: 'adopt' }
  | { kind: 'conflict'; reason: 'legacy' | 'no-anchor' | 'revision' }
  | { kind: 'push' }
  | { kind: 'use-cloud' };

/** 本机有未同步的修改时，根据推前 GET 到的云端决定怎么做。 */
export function decidePush(input: PushInput): PushDecision {
  // 只有从没同步过的新装机才直接采用云端；同步过的设备清空画布是正常编辑。
  if (!input.anchor && input.localIsInitial && input.cloudHasContent) {return { kind: 'use-cloud' };}

  if (input.cloudHash === input.localHash) {
    // 内容一致：有 revision 就认领；旧格式云端推一次补上 revision。
    return input.cloudRevision ? { kind: 'adopt' } : { kind: 'push' };
  }

  if (!input.cloudRevision) {
    // 旧格式云端：没有用户内容，或仍是本机采用过的那份，覆盖都不会丢东西。
    const safe = input.legacyConfirmed || !input.cloudHasContent || input.cloudHash === input.baseHash;
    return safe ? { kind: 'push' } : { kind: 'conflict', reason: 'legacy' };
  }

  if (input.cloudRevision === input.anchor) {return { kind: 'push' };}

  // revision 变了但内容还是基线：别的写入没有改画布，照常推。
  if (input.baseHash && input.cloudHash === input.baseHash) {return { kind: 'push' };}

  return { kind: 'conflict', reason: input.anchor ? 'revision' : 'no-anchor' };
}

export interface PullInput {
  anchor: null | string;
  cloudHasContent: boolean;
  cloudHash: string;
  cloudRevision: null | string;
  localHash: string;
}

/**
 * 本机没有未同步修改时，根据云端决定怎么做。
 * - none：云端没变，或没有可采用的内容。
 * - adopt：内容相同，只认领云端 revision。
 * - apply：用云端覆盖本机（调用方先存快照）。
 */
export function decidePull(input: PullInput): 'adopt' | 'apply' | 'none' {
  if (input.cloudRevision && input.cloudRevision === input.anchor) {return 'none';}

  if (!input.cloudRevision) {
    // 旧格式云端没有 revision；文件缺失时解析成空画布，不能拿它清空本机。
    return input.cloudHash === input.localHash || !input.cloudHasContent ? 'none' : 'apply';
  }

  return input.cloudHash === input.localHash ? 'adopt' : 'apply';
}

export interface VerifyInput {
  cloudHash: string;
  cloudRevision: null | string;
  /** 推送前 GET 到的云端 revision。 */
  previousRevision: null | string;
  pushedHash: string;
  pushedRevision: string;
}

/**
 * 推送后再 GET 一次核对。
 * - ok：云端是这次推送（读到推送前的版本视为读取延迟，以 PATCH 成功为准）。
 * - adopt：别的设备刚推了相同内容，认领它的 revision。
 * - conflict：别的设备刚推了不同内容。
 */
export function decideVerify(input: VerifyInput): 'adopt' | 'conflict' | 'ok' {
  if (input.cloudRevision === input.pushedRevision) {return 'ok';}

  if (input.cloudHash === input.pushedHash) {return input.cloudRevision ? 'adopt' : 'ok';}

  if (input.cloudRevision === input.previousRevision) {return 'ok';}

  return 'conflict';
}
