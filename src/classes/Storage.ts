import { getAllGists, getGists, initGistsId, patchGists } from '@/api/gists';
import { GISTS_FILE_DESCRIPTION } from '@/config';
import { BreakException, isBreakException } from '@/utils/Error';

import type { GistsTabs } from '@/types';

enum storageKeys {
  activePageId = 'activePageId',
  gistsTabs = 'gistsTabs',
  gistsToken = 'gistsToken',
  cloudSync = 'cloudSync',
  autoSync = 'autoSync',
  autoSyncInterval = 'autoSyncInterval',
}

class Storage {
  private gistsTabsId: string = '';
  private initialized = false;

  constructor() {
    this.syncGists(true);
  }

  /**
   * 检查云端是否存在 gists_tabs_data.json 文件
   *
   * @description 如果不存在就创建一个并初始化数据，并记录 gistsTabsId
   */
  private async checkGistTabsFile() {
    if (this.gistsTabsId) return this.gistsTabsId;

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

  async getActivePageId(): Promise<string> {
    const res = await this.get(storageKeys.activePageId);
    return res[storageKeys.activePageId];
  }

  async getAutoSync(): Promise<boolean> {
    const res = await this.get(storageKeys.autoSync);
    return res[storageKeys.autoSync];
  }

  async getAutoSyncInterval(): Promise<number> {
    const res = await this.get(storageKeys.autoSyncInterval);
    return res[storageKeys.autoSyncInterval];
  }

  async getCloudSync(): Promise<boolean> {
    const res = await this.get(storageKeys.cloudSync);
    return res[storageKeys.cloudSync];
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

  async setAutoSync(open: boolean) {
    return this.set(storageKeys.autoSync, open);
  }

  async setAutoSyncInterval(interval: number) {
    return this.set(storageKeys.autoSyncInterval, interval);
  }

  async setCloudSync(open: boolean) {
    return this.set(storageKeys.cloudSync, open);
  }

  async setGistsTabs(data: GistsTabs) {
    await this.set(storageKeys.gistsTabs, data);
    this.syncGists();
  }

  async setGistsToken(token: string) {
    return this.set(storageKeys.gistsToken, token);
  }

  async syncGists(init: boolean = false) {
    try {
      //* 如果没有初始化完成，就不执行
      if (!init && !this.initialized) return;

      //* 检查是否开启了云同步
      const openCloudSync = await this.getCloudSync();
      if (!openCloudSync) return;

      //* 检查云端是否满足条件
      await this.checkGistTabsFile();

      //* 获取云端的 gists 数据
      const cloudData = await getGists(this.gistsTabsId);
      const localData = await this.getGistsTabs();

      const isInitCloudData = !cloudData.pages;
      const isInitLocalData =
        localData.pages.length === 1 && localData.pages[0].name === '首页' && localData.pages[0].widgets.length === 0;

      if (isInitCloudData && !isInitLocalData) {
        //* 如果云端刚刚初始化数据，但是本地有数据，就修改云端数据的更新时间，用于后面本地数据覆盖云端数据
        cloudData.updateAt = -1;
      } else if (!isInitCloudData && isInitLocalData) {
        //* 如果云端有数据，但是本地刚刚初始化，就修改本地数据的更新时间，并更新本地数据缓存，用于后面云端数据覆盖本地数据
        localData.updateAt = -1;
        await this.set(storageKeys.gistsTabs, cloudData);
      }

      //* 完成初始化分析
      if (init) this.initialized = true;

      //* 数据比对
      let newData;
      if (cloudData.updateAt === localData.updateAt) {
        //* 如果两者时间戳相同，就不需要更新
        throw new BreakException();
      } else if (cloudData.updateAt > localData.updateAt) {
        //* 如果云端数据较新，就采用本地数据
        newData = cloudData;
      } else {
        //* 如果本地数据较新，就采用云端数据
        newData = localData;
      }

      if (cloudData.updateAt !== newData.updateAt) {
        //* 更新云端数据
        await patchGists(this.gistsTabsId, newData);
      }

      await this.set(storageKeys.gistsTabs, newData);
    } catch (error) {
      if (isBreakException(error)) return;
      console.error(error);
    }
  }
}

export default new Storage();
