import { buildTodayViewModel, resolveLocale } from "../core/date";
import { normalizePlannedItemText } from "../core/plannedItem";
import { PREMIUM_PRICE_USD, STRIPE_PAYMENT_LINK, getPremiumStatus } from "../core/premium";
import type { AppState, SupportedLocale } from "../core/types";
import type { AppStorage } from "../storage/appStorage";

const translations = {
  ja: {
    appTitle: "きょうボード",
    purpose: "今日の日付・曜日・次の予定を大きく表示します。",
    dateLabel: "今日の日付",
    weekdayLabel: "曜日",
    plannedItemLabel: "次の予定",
    noPlannedItem: "次の予定はまだ登録されていません",
    editTitle: "次の予定を登録",
    editHint: "短い言葉で1件だけ登録できます。",
    plannedItemInputLabel: "次の予定",
    save: "保存",
    saved: "保存しました",
    savedStateLabel: "完了",
    loadingTitle: "読み込み中",
    loading: "保存した内容を確認しています。",
    emptyStateLabel: "未登録",
    language: "表示言語",
    japanese: "日本語",
    english: "English",
    premiumTitle: "Premium",
    trialActive: "7日間トライアル中",
    trialExpired: "トライアルは終了しました",
    premiumActive: "Premium 有効",
    daysRemaining: "残り",
    dayUnit: "日",
    premiumNote: "基本表示はPremiumが無効でも使えます。",
    paymentPending: "支払いリンクは本番設定待ちです",
    paymentMeta: "買い切り",
    privacyNote: "ネットワーク通信なし。保存はこの端末のChrome storageのみです。",
    footerScope: "この拡張は日付・曜日・次の予定の表示だけを行います。",
    loadErrorTitle: "読み込みに失敗しました",
    loadError: "保存データの読み込みに失敗しました。拡張を再読み込みしてください。",
  },
  en: {
    appTitle: "Today Board",
    purpose: "Shows today's date, day of week, and the next planned item in large text.",
    dateLabel: "Today's date",
    weekdayLabel: "Day of week",
    plannedItemLabel: "Next planned item",
    noPlannedItem: "No next planned item has been saved yet",
    editTitle: "Save the next planned item",
    editHint: "Save one short item.",
    plannedItemInputLabel: "Next planned item",
    save: "Save",
    saved: "Saved",
    savedStateLabel: "Done",
    loadingTitle: "Loading",
    loading: "Checking saved content.",
    emptyStateLabel: "Not saved",
    language: "Display language",
    japanese: "日本語",
    english: "English",
    premiumTitle: "Premium",
    trialActive: "7-day trial active",
    trialExpired: "Trial has ended",
    premiumActive: "Premium active",
    daysRemaining: "Days left",
    dayUnit: "day(s)",
    premiumNote: "The basic display works even when Premium is inactive.",
    paymentPending: "Payment link is waiting for production setup",
    paymentMeta: "one-time purchase",
    privacyNote: "No network communication. Data is saved only in this device's Chrome storage.",
    footerScope: "This extension only displays the date, day of week, and next planned item.",
    loadErrorTitle: "Could not load data",
    loadError: "Could not load saved data. Please reload the extension.",
  },
} as const;

type TranslationKey = keyof (typeof translations)["ja"];
type ScheduleRender = (callback: () => void, milliseconds: number) => unknown;

export type TodayBoardAppOptions = {
  root: HTMLElement | null;
  storage: AppStorage;
  preferredLanguage?: string | null;
  now?: () => Date;
  scheduleRender?: ScheduleRender;
};

export function mountTodayBoardApp(options: TodayBoardAppOptions): void {
  const app = new TodayBoardApp(options);
  void app.initialize();
}

class TodayBoardApp {
  private readonly root: HTMLElement | null;
  private readonly storage: AppStorage;
  private readonly preferredLanguage: string | null;
  private readonly now: () => Date;
  private readonly scheduleRender?: ScheduleRender;
  private state!: AppState;
  private statusMessage = "";
  private pendingFocusId: string | null = null;

  constructor(options: TodayBoardAppOptions) {
    this.root = options.root;
    this.storage = options.storage;
    this.preferredLanguage = options.preferredLanguage ?? null;
    this.now = options.now ?? (() => new Date());
    this.scheduleRender = options.scheduleRender;
  }

  async initialize(): Promise<void> {
    if (!this.root) {
      return;
    }

    this.renderLoading(resolveLocale(this.preferredLanguage));

    try {
      const storedState = await this.storage.load();
      const firstOpenedAt = storedState.firstOpenedAt ?? this.now().toISOString();
      const locale = storedState.locale ?? resolveLocale(this.preferredLanguage);

      if (!storedState.firstOpenedAt || !storedState.locale) {
        await this.storage.save({ firstOpenedAt, locale });
      }

      this.state = {
        ...storedState,
        firstOpenedAt,
        locale,
      };

      this.render();
      this.scheduleRender?.(() => this.render(), 60_000);
    } catch {
      this.renderLoadError(resolveLocale(this.preferredLanguage));
    }
  }

  private render(): void {
    if (!this.root || !this.state.locale) {
      return;
    }

    const locale = this.state.locale;
    const now = this.now();
    const today = buildTodayViewModel(now, locale);
    const premium = getPremiumStatus({
      firstOpenedAt: this.state.firstOpenedAt,
      premiumPurchasedAt: this.state.premiumPurchasedAt,
      now,
    });

    this.root.replaceChildren(
      this.createHeader(locale),
      this.createTodayBoard(locale, today.dateText, today.weekdayText),
      this.createPlannedItemCard(locale),
      this.createEditor(locale),
      this.createPremiumCard(locale, premium),
      this.createFooter(locale),
    );
  }

  private createHeader(locale: SupportedLocale): HTMLElement {
    const header = element("header", "app-header");
    const titleBlock = element("div");
    const title = element("h1", "app-title", text(locale, "appTitle"));
    const purpose = element("p", "app-purpose", text(locale, "purpose"));
    titleBlock.append(title, purpose);

    const languageControls = element("div", "language-controls");
    const label = element("p", "control-label", text(locale, "language"));
    label.id = "language-controls-label";
    languageControls.setAttribute("role", "group");
    languageControls.setAttribute("aria-labelledby", "language-controls-label");
    const jaButton = this.createLanguageButton(locale, "ja", text(locale, "japanese"));
    const enButton = this.createLanguageButton(locale, "en", text(locale, "english"));
    languageControls.append(label, jaButton, enButton);

    header.append(titleBlock, languageControls);
    return header;
  }

  private createLanguageButton(
    currentLocale: SupportedLocale,
    nextLocale: SupportedLocale,
    label: string,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.id = `language-${nextLocale}`;
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(currentLocale === nextLocale));
    button.addEventListener("click", () => {
      void this.updateLocale(nextLocale);
    });
    return button;
  }

  private createTodayBoard(locale: SupportedLocale, dateText: string, weekdayText: string): HTMLElement {
    const section = element("section", "today-board");
    section.setAttribute("aria-label", text(locale, "appTitle"));
    section.append(
      createLargeFact("date-fact", text(locale, "dateLabel"), dateText),
      createLargeFact("weekday-fact", text(locale, "weekdayLabel"), weekdayText),
    );
    return section;
  }

  private createPlannedItemCard(locale: SupportedLocale): HTMLElement {
    const hasPlannedItem = this.state.plannedItem.text.length > 0;
    const section = element("section", hasPlannedItem ? "planned-card" : "planned-card empty-state");
    const heading = element("h2", "section-title", text(locale, "plannedItemLabel"));
    heading.id = "planned-item-heading";
    section.setAttribute("aria-labelledby", "planned-item-heading");
    const plannedText = hasPlannedItem ? this.state.plannedItem.text : text(locale, "noPlannedItem");
    const value = element("p", hasPlannedItem ? "planned-value" : "planned-value empty", plannedText);

    if (!hasPlannedItem) {
      section.append(heading, element("p", "state-badge", text(locale, "emptyStateLabel")), value);
      return section;
    }

    section.append(heading, value);
    return section;
  }

  private createEditor(locale: SupportedLocale): HTMLElement {
    const section = element("section", "editor-card");
    const heading = element("h2", "section-title", text(locale, "editTitle"));
    heading.id = "planned-item-editor-heading";
    const hint = element("p", "hint", text(locale, "editHint"));
    hint.id = "planned-item-hint";
    section.setAttribute("aria-labelledby", "planned-item-editor-heading");
    const form = document.createElement("form");
    form.className = "planned-form";

    const label = document.createElement("label");
    label.className = "input-label";
    label.htmlFor = "planned-item";
    label.textContent = text(locale, "plannedItemInputLabel");

    const input = document.createElement("input");
    input.id = "planned-item";
    input.name = "planned-item";
    input.type = "text";
    input.maxLength = 80;
    input.value = this.state.plannedItem.text;
    input.autocomplete = "off";
    input.setAttribute("aria-describedby", "planned-item-hint planned-item-status");

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-button";
    saveButton.textContent = text(locale, "save");

    form.append(label, input, saveButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.savePlannedItem(input.value);
    });

    section.append(heading, hint, form);

    const message = element("p", this.statusMessage ? "status-message" : "visually-hidden");
    message.id = "planned-item-status";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.setAttribute("aria-atomic", "true");
    if (this.statusMessage) {
      message.append(element("span", "status-label", text(locale, "savedStateLabel")), this.statusMessage);
    }
    section.append(message);

    return section;
  }

  private createPremiumCard(
    locale: SupportedLocale,
    premium: ReturnType<typeof getPremiumStatus>,
  ): HTMLElement {
    const section = element("section", "premium-card");
    const heading = element("h2", "section-title", text(locale, "premiumTitle"));
    heading.id = "premium-heading";
    section.setAttribute("aria-labelledby", "premium-heading");
    const status = premium.isPremium
      ? text(locale, "premiumActive")
      : premium.isTrialActive
        ? `${text(locale, "trialActive")} - ${text(locale, "daysRemaining")} ${premium.daysRemaining} ${text(locale, "dayUnit")}`
        : text(locale, "trialExpired");
    const statusLine = element("p", "premium-status", status);
    const note = element("p", "hint", text(locale, "premiumNote"));
    const payment = element(
      "p",
      "payment-placeholder",
      `$${PREMIUM_PRICE_USD} ${text(locale, "paymentMeta")} - ${text(locale, "paymentPending")}`,
    );
    payment.dataset.paymentLinkPlaceholder = STRIPE_PAYMENT_LINK;
    section.append(heading, statusLine, note, payment);
    return section;
  }

  private createFooter(locale: SupportedLocale): HTMLElement {
    const footer = element("footer", "app-footer");
    footer.append(element("p", "", text(locale, "privacyNote")), element("p", "", text(locale, "footerScope")));
    return footer;
  }

  private async savePlannedItem(rawValue: string): Promise<void> {
    const locale = this.state.locale;
    if (!locale) {
      return;
    }

    const plannedItem = {
      text: normalizePlannedItemText(rawValue),
      updatedAt: this.now().toISOString(),
    };
    await this.storage.save({ plannedItem });
    this.state = {
      ...this.state,
      plannedItem,
    };
    this.statusMessage = text(locale, "saved");
    this.render();
    this.pendingFocusId = "planned-item";
    this.restorePendingFocus();
  }

  private async updateLocale(locale: SupportedLocale): Promise<void> {
    await this.storage.save({ locale });
    this.state = {
      ...this.state,
      locale,
    };
    this.statusMessage = "";
    this.render();
    this.pendingFocusId = `language-${locale}`;
    this.restorePendingFocus();
  }

  private restorePendingFocus(): void {
    if (!this.pendingFocusId) {
      return;
    }

    document.getElementById(this.pendingFocusId)?.focus();
    this.pendingFocusId = null;
  }

  private renderLoadError(locale: SupportedLocale): void {
    const error = element("section", "load-error state-card");
    error.setAttribute("role", "alert");
    error.append(
      element("h1", "state-title", text(locale, "loadErrorTitle")),
      element("p", "state-description", text(locale, "loadError")),
    );
    this.root?.replaceChildren(error);
  }

  private renderLoading(locale: SupportedLocale): void {
    const loading = element("section", "loading-card state-card");
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    loading.append(
      element("h1", "state-title", text(locale, "loadingTitle")),
      element("p", "state-description", text(locale, "loading")),
    );
    this.root?.replaceChildren(loading);
  }
}

function createLargeFact(idPrefix: string, label: string, value: string): HTMLElement {
  const wrapper = element("article", "large-fact");
  const labelNode = element("p", "fact-label", label);
  labelNode.id = `${idPrefix}-label`;
  wrapper.setAttribute("aria-labelledby", `${idPrefix}-label`);
  wrapper.append(labelNode, element("p", "fact-value", value));
  return wrapper;
}

function text(locale: SupportedLocale, key: TranslationKey): string {
  return translations[locale][key];
}

function element(tagName: string, className = "", content = ""): HTMLElement {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (content) {
    node.textContent = content;
  }
  return node;
}
