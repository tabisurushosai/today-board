import type { SupportedLocale } from "./types";

export type TodayViewModel = Readonly<{
  dateText: string;
  weekdayText: string;
}>;

export function resolveLocale(language?: string | null): SupportedLocale {
  return language?.toLowerCase().startsWith("en") ? "en" : "ja";
}

export function toIntlLocale(locale: SupportedLocale): string {
  return locale === "ja" ? "ja-JP" : "en-US";
}

export function buildTodayViewModel(date: Date, locale: SupportedLocale): TodayViewModel {
  const intlLocale = toIntlLocale(locale);
  const dateText = new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  const weekdayText = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
  }).format(date);

  return {
    dateText,
    weekdayText,
  };
}
