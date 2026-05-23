import type { AppState, AppStatePatch } from "../core/types";
import type { AppStorage, SerializedAppStatePatch, StorageRecord } from "./appStorage";
import { deserializeAppState, serializeAppStatePatch } from "./serialization";

export class ChromeLocalStorageAdapter implements AppStorage {
  constructor(private readonly storageArea: chrome.storage.StorageArea = chrome.storage.local) {}

  async load(): Promise<AppState> {
    const items = await chromeGetAll(this.storageArea);
    return deserializeAppState(items);
  }

  async save(patch: AppStatePatch): Promise<void> {
    await chromeSet(this.storageArea, serializeAppStatePatch(patch));
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
