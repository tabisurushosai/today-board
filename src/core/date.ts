import type { SupportedLocale } from "./types";

export type TodayViewModel = {
  dateText: string;
  weekdayText: string;
  isoDate: string;
};

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
    isoDate: toLocalIsoDate(date),
  };
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
