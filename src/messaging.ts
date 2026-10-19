import { defineExtensionMessaging } from '@webext-core/messaging';

export interface SyncCommandResult {
  ok: boolean;
  reason?: string;
}

interface ProtocolMap {
  coldStart(): void;
  pullFromCloud(): SyncCommandResult;
  resolveConflict(action: 'keepLocal' | 'useCloud'): void;
  retrySync(): void;
  /** 标脏后的防抖推送。dirty 已为 true 时 storage 监听不会再次触发，所以每次编辑都发这条。 */
  schedulePush(delayMs: number): void;
  stopSync(): void;
  syncNow(): SyncCommandResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
