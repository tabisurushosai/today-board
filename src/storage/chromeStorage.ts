import { createDefaultState, normalizeStoredLocale, normalizeStoredString } from "../core/state";
import type { AppState, AppStatePatch, PlannedItem } from "../core/types";
import type { AppStorage } from "./appStorage";

const STORAGE_KEYS = {
  plannedItemText: "plannedItemText",
  plannedItemUpdatedAt: "plannedItemUpdatedAt",
  firstOpenedAt: "firstOpenedAt",
  premiumPurchasedAt: "premiumPurchasedAt",
  locale: "locale",
} as const;

export class ChromeLocalStorageAdapter implements AppStorage {
  async load(): Promise<AppState> {
    const items = await chromeGetAll();
    const defaultState = createDefaultState();

    return {
      ...defaultState,
      plannedItem: normalizeStoredPlannedItem(items),
      firstOpenedAt: normalizeStoredString(items[STORAGE_KEYS.firstOpenedAt]),
      premiumPurchasedAt: normalizeStoredString(items[STORAGE_KEYS.premiumPurchasedAt]),
      locale: normalizeStoredLocale(items[STORAGE_KEYS.locale]),
    };
  }

  async save(patch: AppStatePatch): Promise<void> {
    const serialized: Record<string, string | null> = {};

    if (patch.plannedItem) {
      serialized[STORAGE_KEYS.plannedItemText] = patch.plannedItem.text;
      serialized[STORAGE_KEYS.plannedItemUpdatedAt] = patch.plannedItem.updatedAt;
    }

    if (patch.firstOpenedAt !== undefined) {
      serialized[STORAGE_KEYS.firstOpenedAt] = patch.firstOpenedAt;
    }

    if (patch.premiumPurchasedAt !== undefined) {
      serialized[STORAGE_KEYS.premiumPurchasedAt] = patch.premiumPurchasedAt;
    }

    if (patch.locale !== undefined) {
      serialized[STORAGE_KEYS.locale] = patch.locale;
    }

    await chromeSet(serialized);
  }
}

function normalizeStoredPlannedItem(items: Record<string, unknown>): PlannedItem {
  return {
    text: normalizeStoredString(items[STORAGE_KEYS.plannedItemText]) ?? "",
    updatedAt: normalizeStoredString(items[STORAGE_KEYS.plannedItemUpdatedAt]),
  };
}

function chromeGetAll(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(items);
    });
  });
}

function chromeSet(items: Record<string, string | null>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}
