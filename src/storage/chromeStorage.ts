import type { StorageAdapter, StoragePatch, StorageRecord } from "./storageAdapter";

export class ChromeLocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storageArea: chrome.storage.StorageArea = chrome.storage.local) {}

  async readAll(): Promise<StorageRecord> {
    return chromeGetAll(this.storageArea);
  }

  async write(patch: StoragePatch): Promise<void> {
    await chromeSet(this.storageArea, patch);
  }
}

function chromeGetAll(storageArea: chrome.storage.StorageArea): Promise<StorageRecord> {
  return new Promise((resolve, reject) => {
    storageArea.get(null, (items: StorageRecord) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(items);
    });
  });
}

function chromeSet(storageArea: chrome.storage.StorageArea, items: StoragePatch): Promise<void> {
  return new Promise((resolve, reject) => {
    storageArea.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}
