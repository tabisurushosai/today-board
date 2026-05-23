import type { AppState, PlannedItem, SupportedLocale } from "./types";

export function createEmptyPlannedItem(): PlannedItem {
  return {
    text: "",
    updatedAt: null,
  };
}

export function createDefaultState(): AppState {
  return {
    plannedItem: createEmptyPlannedItem(),
    firstOpenedAt: null,
    premiumPurchasedAt: null,
    locale: null,
  };
}

export function normalizeStoredLocale(value: unknown): SupportedLocale | null {
  return value === "ja" || value === "en" ? value : null;
}

export function normalizeStoredString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
