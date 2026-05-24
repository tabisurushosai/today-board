import type { SerializedAppStatePatch, StorageAdapter, StorageRecord } from "./appStorage";

export class ChromeLocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storageArea: chrome.storage.StorageArea = chrome.storage.local) {}

  async readAll(): Promise<StorageRecord> {
    return chromeGetAll(this.storageArea);
  }

  async write(patch: SerializedAppStatePatch): Promise<void> {
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

function chromeSet(storageArea: chrome.storage.StorageArea, items: SerializedAppStatePatch): Promise<void> {
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
