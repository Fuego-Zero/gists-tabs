import { getAllGists, getGists, initGistsId, patchGists } from '@/api/gists';
import { GISTS_FILE_DESCRIPTION } from '@/config';

import type { GistsTabs } from '@/types';

enum storageKeys {
  activePageId = 'activePageId',
  gistsTabs = 'gistsTabs',
  gistsToken = 'gistsToken',
  cloudSync = 'cloudSync',
}

class Storage {
  private gistsTabsId: string = '';
  private init = this.checkGistTabsFile();

  /**
   * 检查云端是否存在 gists_tabs_data.json 文件，如果不存在就创建一个
   */
  private async checkGistTabsFile() {
    const allGists = await getAllGists();
    const { length } = allGists;

    if (length === 0) {
      this.gistsTabsId = await initGistsId();
      return;
    }

    const gists = allGists.find((item) => item.description === GISTS_FILE_DESCRIPTION);
    if (!gists) {
      this.gistsTabsId = await initGistsId();
      return;
    }

    this.gistsTabsId = gists.id;
  }

  private get(keys: string | string[]) {
    return chrome.storage.local.get(keys);
  }

  private set(key: keyof typeof storageKeys, value: any): Promise<void> {
    return chrome.storage.local.set({ [key]: value });
  }

  private async syncGists() {
    try {
      //* 检查是否开启了云同步
      const openCloudSync = await this.getOpenCloudSync();
      if (!openCloudSync) return;

      //* 检查云端是否存在 gists_tabs_data.json 文件
      await this.checkGistTabsFile();

      //* 获取云端的 gists 数据
      const cloudData = await getGists(this.gistsTabsId);
      const localData = await this.getGistsTabs();

      //* 与本地数据进行比对
      let newData;
      if (cloudData.updateAt > localData.updateAt) {
        //* 如果云端数据更新，就更新本地数据
        newData = cloudData;
      } else {
        //* 如果本地数据更新，就更新云端数据
        newData = localData;
      }

      //* 更新云端数据
      await patchGists(this.gistsTabsId, newData);
    } catch (error) {
      console.error(error);
    }
  }

  async getActivePageId(): Promise<string> {
    const res = await this.get(storageKeys.activePageId);
    return res[storageKeys.activePageId];
  }

  async getGistsTabs(): Promise<GistsTabs> {
    await this.init;
    const res = await this.get(storageKeys.gistsTabs);
    return res[storageKeys.gistsTabs];
  }

  async getGistsToken(): Promise<string> {
    const res = await this.get(storageKeys.gistsToken);
    return res[storageKeys.gistsToken];
  }

  async getOpenCloudSync(): Promise<boolean> {
    const res = await this.get(storageKeys.cloudSync);
    return res[storageKeys.cloudSync];
  }

  async setActivePageId(pageId: string) {
    return this.set(storageKeys.activePageId, pageId);
  }

  async setGistsTabs(data: GistsTabs) {
    await this.set(storageKeys.gistsTabs, data);
    this.syncGists();
  }

  async setGistsToken(token: string) {
    return this.set(storageKeys.gistsToken, token);
  }

  async setOpenCloudSync(open: boolean) {
    return this.set(storageKeys.cloudSync, open);
  }
}

export default new Storage();
