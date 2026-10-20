import { defineBackground } from 'wxt/utils/define-background';

import Storage from '@/classes/Storage';
import { onMessage } from '@/messaging';

export default defineBackground(() => {
  console.log('This is the background page.');
  console.log('Put the background scripts here.');

  Storage.startEngine();

  onMessage('schedulePush', ({ data }) => {
    Storage.schedulePushFromEngine(data);
  });
  onMessage('coldStart', () => {
    void Storage.coldStartFromEngine();
  });
  onMessage('stopSync', () => {
    void Storage.stopSyncFromEngine();
  });
  onMessage('tokenChanged', () => {
    void Storage.tokenChangedFromEngine();
  });
  onMessage('syncNow', () => Storage.syncGists());
  onMessage('pullFromCloud', () => Storage.pullFromCloudConfirmed());
  onMessage('retrySync', () => Storage.retrySync());
  onMessage('resolveConflict', ({ data }) => {
    if (data === 'keepLocal') {return Storage.resolveConflictKeepLocal();}

    return Storage.resolveConflictUseCloud();
  });
});
