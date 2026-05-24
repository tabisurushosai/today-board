import type { AppState, AppStatePatch, PlannedItem, SupportedLocale } from "../core/types";
import type { StoragePatch, StorageRecord } from "./storageAdapter";

export const APP_STORAGE_KEYS = {
  plannedItemText: "plannedItemText",
  plannedItemUpdatedAt: "plannedItemUpdatedAt",
  firstOpenedAt: "firstOpenedAt",
  premiumPurchasedAt: "premiumPurchasedAt",
  locale: "locale",
} as const;

export const APP_STORAGE_KEY_LIST = [
  APP_STORAGE_KEYS.plannedItemText,
  APP_STORAGE_KEYS.plannedItemUpdatedAt,
  APP_STORAGE_KEYS.firstOpenedAt,
  APP_STORAGE_KEYS.premiumPurchasedAt,
  APP_STORAGE_KEYS.locale,
] as const;

export function deserializeAppState(items: StorageRecord): AppState {
  return {
    plannedItem: deserializePlannedItem(items),
    firstOpenedAt: normalizeStoredString(items[APP_STORAGE_KEYS.firstOpenedAt]),
    premiumPurchasedAt: normalizeStoredString(items[APP_STORAGE_KEYS.premiumPurchasedAt]),
    locale: normalizeStoredLocale(items[APP_STORAGE_KEYS.locale]),
  };
}

export function serializeAppStatePatch(patch: AppStatePatch): StoragePatch {
  const serialized: StoragePatch = {};

  if (patch.plannedItem) {
    serialized[APP_STORAGE_KEYS.plannedItemText] = patch.plannedItem.text;
    serialized[APP_STORAGE_KEYS.plannedItemUpdatedAt] = patch.plannedItem.updatedAt;
  }

  if (patch.firstOpenedAt !== undefined) {
    serialized[APP_STORAGE_KEYS.firstOpenedAt] = patch.firstOpenedAt;
  }

  if (patch.premiumPurchasedAt !== undefined) {
    serialized[APP_STORAGE_KEYS.premiumPurchasedAt] = patch.premiumPurchasedAt;
  }

  if (patch.locale !== undefined) {
    serialized[APP_STORAGE_KEYS.locale] = patch.locale;
  }

  return serialized;
}

function deserializePlannedItem(items: StorageRecord): PlannedItem {
  return {
    text: normalizeStoredString(items[APP_STORAGE_KEYS.plannedItemText]) ?? "",
    updatedAt: normalizeStoredString(items[APP_STORAGE_KEYS.plannedItemUpdatedAt]),
  };
}

function normalizeStoredLocale(value: unknown): SupportedLocale | null {
  return value === "ja" || value === "en" ? value : null;
}

function normalizeStoredString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
