import { buildTodayViewModel, resolveLocale } from "../core/date";
import { formatDayCount, formatUsdPrice } from "../core/format";
import { MAX_PLANNED_ITEM_LENGTH, normalizePlannedItemText } from "../core/plannedItem";
import { PREMIUM_PRICE_USD, STRIPE_PAYMENT_LINK, getPremiumStatus } from "../core/premium";
import type { AppState, SupportedLocale } from "../core/types";
import type { AppStorage } from "../storage/appStorage";

const translations = {
  ja: {
    appTitle: "きょうボード",
    purpose: "今日の日付・曜日・次の予定を大きな文字で表示します。",
    dateLabel: "今日の日付",
    weekdayLabel: "曜日",
    plannedItemLabel: "次の予定",
    noPlannedItem: "次の予定はまだ登録されていません。",
    firstRunGuideTitle: "はじめに",
    firstRunGuide: "次の予定を1件だけ入れると、今日の表示と一緒に大きく確認できます。",
    emptyStateDescription: "日付と曜日はこのまま確認できます。次の予定は1件だけ保存できます。",
    emptyStateAction: "入力欄へ移動",
    editTitle: "次の予定を登録",
    editHint: "1件だけ、短い言葉で入力してください。",
    plannedItemInputLabel: "次の予定",
    save: "保存",
    saved: "保存しました",
    savedStateLabel: "完了",
    loadingTitle: "読み込み中",
    loading: "保存済みの内容を確認しています。",
    emptyStateLabel: "未登録",
    language: "表示言語",
    japanese: "日本語",
    english: "English",
    premiumTitle: "プレミアム",
    trialActive: "7日間のトライアル中",
    trialExpired: "トライアルは終了しました",
    premiumActive: "プレミアムは有効です",
    trialRemaining: "残り",
    premiumNote: "プレミアムが無効でも、基本表示は使えます。",
    paymentPending: "支払いリンクは本番環境の設定待ちです。",
    paymentMeta: "買い切り",
    privacyNote: "ネットワーク通信は行いません。保存先はこの端末のローカル保存のみです。",
    footerScope: "この拡張は日付・曜日・次の予定の表示だけを行います。",
    loadErrorTitle: "読み込みに失敗しました",
    loadError: "保存データを読み込めませんでした。拡張機能を再読み込みしてください。",
  },
  en: {
    appTitle: "Today Board",
    purpose: "Displays today's date, day of the week, and the next planned item in large text.",
    dateLabel: "Today's date",
    weekdayLabel: "Day of the week",
    plannedItemLabel: "Next planned item",
    noPlannedItem: "No next planned item is saved yet.",
    firstRunGuideTitle: "First step",
    firstRunGuide: "Add one next planned item to see it in large text with today's display.",
    emptyStateDescription: "The date and day of the week are ready to use. You can save one next planned item.",
    emptyStateAction: "Go to input",
    editTitle: "Save next planned item",
    editHint: "Enter one short item only.",
    plannedItemInputLabel: "Next planned item",
    save: "Save",
    saved: "Saved",
    savedStateLabel: "Done",
    loadingTitle: "Loading",
    loading: "Checking saved data.",
    emptyStateLabel: "Not saved",
    language: "Display language",
    japanese: "日本語",
    english: "English",
    premiumTitle: "Premium",
    trialActive: "7-day trial active",
    trialExpired: "Trial has ended",
    premiumActive: "Premium active",
    trialRemaining: "left",
    premiumNote: "The basic display works even when Premium is inactive.",
    paymentPending: "Payment link is pending production configuration.",
    paymentMeta: "one-time purchase",
    privacyNote: "No network communication is used. Data is saved only in this device's local storage.",
    footerScope: "This extension only displays the date, the day of the week, and the next planned item.",
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
  private readonly scheduleRender: ScheduleRender | undefined;
  private state!: AppState;
  private statusMessage = "";
  private pendingFocusId: string | null = null;
  private showFirstRunGuide = false;

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
      const isFirstOpen = !storedState.firstOpenedAt;
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
      this.showFirstRunGuide = isFirstOpen && this.state.plannedItem.text.length === 0;

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
    this.syncDocumentMetadata(locale);
    const now = this.now();
    const today = buildTodayViewModel(now, locale);
    const premium = getPremiumStatus({
      firstOpenedAt: this.state.firstOpenedAt,
      premiumPurchasedAt: this.state.premiumPurchasedAt,
      now,
    });

    this.root.replaceChildren(
      this.createHeader(locale),
      ...(this.showFirstRunGuide ? [this.createFirstRunGuide(locale)] : []),
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

  private createFirstRunGuide(locale: SupportedLocale): HTMLElement {
    const section = element("section", "onboarding-card");
    const heading = element("h2", "onboarding-title", text(locale, "firstRunGuideTitle"));
    heading.id = "onboarding-heading";
    section.setAttribute("aria-labelledby", "onboarding-heading");
    section.append(heading, element("p", "onboarding-guide", text(locale, "firstRunGuide")));
    return section;
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
    const stateBadge = element(
      "p",
      hasPlannedItem ? "state-badge state-badge-success" : "state-badge",
      text(locale, hasPlannedItem ? "savedStateLabel" : "emptyStateLabel"),
    );
    const plannedText = hasPlannedItem ? this.state.plannedItem.text : text(locale, "noPlannedItem");
    const value = element("p", hasPlannedItem ? "planned-value" : "planned-value empty", plannedText);

    if (!hasPlannedItem) {
      const description = element("p", "empty-description", text(locale, "emptyStateDescription"));
      const action = document.createElement("button");
      action.type = "button";
      action.className = "secondary-button empty-action";
      action.textContent = text(locale, "emptyStateAction");
      action.setAttribute("aria-controls", "planned-item");
      action.addEventListener("click", () => {
        document.getElementById("planned-item")?.focus();
      });

      section.append(
        heading,
        stateBadge,
        value,
        description,
        action,
      );
      return section;
    }

    section.append(heading, stateBadge, value);
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
    input.maxLength = MAX_PLANNED_ITEM_LENGTH;
    input.value = this.state.plannedItem.text;
    input.autocomplete = "off";
    input.enterKeyHint = "done";
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
        ? formatTrialStatus(locale, premium.daysRemaining)
        : text(locale, "trialExpired");
    const statusLine = element("p", "premium-status", status);
    const note = element("p", "hint", text(locale, "premiumNote"));
    const payment = element(
      "p",
      "payment-placeholder",
      formatPaymentSummary(locale, PREMIUM_PRICE_USD),
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
    this.showFirstRunGuide = false;
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
    this.syncDocumentMetadata(locale);
    const error = element("section", "load-error state-card");
    error.setAttribute("role", "alert");
    error.append(
      element("h1", "state-title", text(locale, "loadErrorTitle")),
      element("p", "state-description", text(locale, "loadError")),
    );
    this.root?.replaceChildren(error);
  }

  private renderLoading(locale: SupportedLocale): void {
    this.syncDocumentMetadata(locale);
    const loading = element("section", "loading-card state-card");
    loading.setAttribute("role", "status");
    loading.setAttribute("aria-live", "polite");
    loading.append(
      element("h1", "state-title", text(locale, "loadingTitle")),
      element("p", "state-description", text(locale, "loading")),
    );
    this.root?.replaceChildren(loading);
  }

  private syncDocumentMetadata(locale: SupportedLocale): void {
    document.documentElement.lang = locale;
    document.title = text(locale, "appTitle");
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

function formatTrialStatus(locale: SupportedLocale, daysRemaining: number): string {
  const remainingDays = formatDayCount(daysRemaining, locale);
  if (locale === "ja") {
    return `${text(locale, "trialActive")}（${text(locale, "trialRemaining")}${remainingDays}）`;
  }

  return `${text(locale, "trialActive")} (${remainingDays} ${text(locale, "trialRemaining")})`;
}

function formatPaymentSummary(locale: SupportedLocale, amountUsd: number): string {
  const price = formatUsdPrice(amountUsd, locale);
  if (locale === "ja") {
    return `${price}（${text(locale, "paymentMeta")}）。${text(locale, "paymentPending")}`;
  }

  return `${price} ${text(locale, "paymentMeta")}. ${text(locale, "paymentPending")}`;
}

function element<TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  className = "",
  content = "",
): HTMLElementTagNameMap[TagName] {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (content) {
    node.textContent = content;
  }
  return node;
}
