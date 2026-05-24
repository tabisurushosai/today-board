import type { StorageAdapter, StoragePatch, StorageRecord } from "./storageAdapter";

export class ChromeLocalStorageAdapter implements StorageAdapter {
  constructor(private readonly storageArea: chrome.storage.StorageArea = chrome.storage.local) {}

  async read(keys: readonly string[]): Promise<StorageRecord> {
    return chromeGet(this.storageArea, keys);
  }

  async write(patch: StoragePatch): Promise<void> {
    await chromeSet(this.storageArea, patch);
  }
}

function chromeGet(storageArea: chrome.storage.StorageArea, keys: readonly string[]): Promise<StorageRecord> {
  return new Promise((resolve, reject) => {
    storageArea.get([...keys], (items: StorageRecord) => {
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
