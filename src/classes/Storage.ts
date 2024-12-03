class Storage {
  private get(keys: string | string[]) {
    return chrome.storage.local.get(keys);
  }

  private set(items: Record<string, any>): Promise<void> {
    return chrome.storage.local.set(items);
  }

  async getActivePageId(): Promise<string> {
    const res = await this.get('activePageId');
    return res.activePageId;
  }

  async setActivePageId(pageId: string) {
    return this.set({ activePageId: pageId });
  }
}

export default new Storage();
