export type SupportedLocale = "ja" | "en";

export type PlannedItem = Readonly<{
  text: string;
  updatedAt: string | null;
}>;

export type AppState = Readonly<{
  plannedItem: PlannedItem;
  firstOpenedAt: string | null;
  premiumPurchasedAt: string | null;
  locale: SupportedLocale | null;
}>;

export type AppStatePatch = Readonly<Partial<{
  plannedItem: PlannedItem;
  firstOpenedAt: string;
  premiumPurchasedAt: string | null;
  locale: SupportedLocale;
}>>;
