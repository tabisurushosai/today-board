import { toIntlLocale } from "./date";
import type { SupportedLocale } from "./types";

export function formatDayCount(dayCount: number, locale: SupportedLocale): string {
  const formattedCount = formatInteger(dayCount, locale);
  if (locale === "ja") {
    return `${formattedCount}日`;
  }

  return `${formattedCount} ${dayCount === 1 ? "day" : "days"}`;
}

export function formatDayCountAdjective(dayCount: number, locale: SupportedLocale): string {
  const formattedCount = formatInteger(dayCount, locale);
  if (locale === "ja") {
    return `${formattedCount}日間`;
  }

  return `${formattedCount}-day`;
}

export function formatUsdPrice(amount: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInteger(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}
