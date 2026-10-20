import { defineExtensionMessaging } from '@webext-core/messaging';

export interface SyncCommandResult {
  ok: boolean;
  reason?: string;
}

interface ProtocolMap {
  /** 打开新标签页、开启云同步时发送：有修改就推，否则按节流拉取。 */
  coldStart(): void;
  pullFromCloud(): SyncCommandResult;
  resolveConflict(action: 'keepLocal' | 'useCloud'): SyncCommandResult;
  retrySync(): SyncCommandResult;
  /** 标脏后的防抖推送。dirty 已为 true 时 storage 监听不会再次触发，所以每次编辑都发这条。 */
  schedulePush(delayMs: number): void;
  stopSync(): void;
  syncNow(): SyncCommandResult;
  /** Token 已写入存储；鉴权失败暂停中的同步据此恢复。 */
  tokenChanged(): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
