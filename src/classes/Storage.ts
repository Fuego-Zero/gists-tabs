import type { GistsTabs } from '@/types';

enum storageKeys {
  activePageId = 'activePageId',
  gistsTabs = 'gistsTabs',
  gistsToken = 'gistsToken',
}

class Storage {
  private get(keys: string | string[]) {
    return chrome.storage.local.get(keys);
  }

  private set(key: keyof typeof storageKeys, value: any): Promise<void> {
    return chrome.storage.local.set({ [key]: value });
  }

  async getActivePageId(): Promise<string> {
    const res = await this.get(storageKeys.activePageId);
    return res[storageKeys.activePageId];
  }

  async getGistsTabs(): Promise<GistsTabs> {
    const res = await this.get(storageKeys.gistsTabs);
    return res[storageKeys.gistsTabs];
  }

  async getGistsToken(): Promise<string> {
    const res = await this.get(storageKeys.gistsToken);
    return res[storageKeys.gistsToken];
  }

  async setActivePageId(pageId: string) {
    return this.set(storageKeys.activePageId, pageId);
  }

  async setGistsTabs(data: GistsTabs) {
    return this.set(storageKeys.gistsTabs, data);
  }

  async setGistsToken(token: string) {
    return this.set(storageKeys.gistsToken, token);
  }
}

export default new Storage();
