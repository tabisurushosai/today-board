export const MAX_PLANNED_ITEM_LENGTH = 80;

export function normalizePlannedItemText(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_PLANNED_ITEM_LENGTH);
}
