import type { AppState, PlannedItem } from "./types";

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
