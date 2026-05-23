export type SupportedLocale = "ja" | "en";

export type PlannedItem = {
  text: string;
  updatedAt: string | null;
};

export type AppState = {
  plannedItem: PlannedItem;
  firstOpenedAt: string | null;
  premiumPurchasedAt: string | null;
  locale: SupportedLocale | null;
};

export type AppStatePatch = Partial<{
  plannedItem: PlannedItem;
  firstOpenedAt: string;
  premiumPurchasedAt: string | null;
  locale: SupportedLocale;
}>;
