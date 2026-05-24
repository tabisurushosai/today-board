import { buildTodayViewModel, resolveLocale } from "../core/date";
import { formatDayCount, formatDayCountAdjective, formatInteger, formatUsdPrice } from "../core/format";
import { MAX_PLANNED_ITEM_LENGTH, normalizePlannedItemText } from "../core/plannedItem";
import { PREMIUM_PRICE_USD, STRIPE_PAYMENT_LINK, TRIAL_DAYS, getPremiumStatus } from "../core/premium";
import type { PremiumStatus } from "../core/premium";
import type { AppState, PlannedItem, SupportedLocale } from "../core/types";
import type { AppStorage } from "../storage/appStorage";

const translations = {
  ja: {
    appTitle: "きょうボード",
    purpose: "今日の日付・曜日・次の予定を大きな文字で表示します。",
    dateLabel: "今日の日付",
    weekdayLabel: "曜日",
    plannedItemLabel: "次の予定",
    noPlannedItem: "次の予定を保存すると、ここに大きく表示されます。",
    firstRunGuideTitle: "一言ガイド",
    firstRunGuide: "まずは下の「入力欄へ進む」から、次の予定を1件だけ保存します。",
    emptyStateDescription: "日付と曜日はこのまま確認できます。予定を保存すると、この枠に大きく表示されます。",
    emptyStateAction: "入力欄へ進む",
    skipToEditor: "次の予定の入力欄へ移動",
    editTitle: "次の予定を保存",
    editHint: "予定は1件だけ、短い言葉で入力します。",
    plannedItemInputLabel: "次の予定",
    plannedItemPlaceholder: "例: 15:00 外出",
    save: "保存",
    saved: "保存しました。",
    savedStateLabel: "保存済み",
    statusSuccessLabel: "完了",
    loadingTitle: "読み込み中",
    loading: "保存済みの内容を読み込んでいます。",
    emptyStateLabel: "未保存",
    language: "表示言語",
    languageKeyboardHint: "矢印キー、Homeキー、Endキーでも表示言語を切り替えられます。",
    japanese: "日本語",
    english: "英語",
    premiumTitle: "プレミアム",
    trialActive: "トライアル中",
    trialExpired: "トライアルは終了しました",
    premiumActive: "プレミアムが有効です",
    trialRemaining: "残り",
    premiumNote: "プレミアムが無効でも、日付・曜日・次の予定の基本表示は使えます。",
    paymentPending: "支払いリンクは本番環境の設定待ちです。",
    paymentMeta: "買い切り",
    privacyNote: "ネットワーク通信は行いません。データはこの端末内にだけ保存されます。",
    footerScope: "この拡張機能は、日付・曜日・次の予定の表示だけを行います。",
    loadErrorTitle: "読み込みに失敗しました",
    loadError: "保存データを読み込めませんでした。拡張機能を再読み込みしてください。",
  },
  en: {
    appTitle: "Today Board",
    purpose: "Shows today's date, weekday, and next planned item in large text.",
    dateLabel: "Today's date",
    weekdayLabel: "Weekday",
    plannedItemLabel: "Next planned item",
    noPlannedItem: "Save a planned item to show it here in large text.",
    firstRunGuideTitle: "Quick guide",
    firstRunGuide: "Start by choosing “Go to input” below, then save one next planned item.",
    emptyStateDescription: "The date and weekday are ready to view. After you save an item, it appears in this large display area.",
    emptyStateAction: "Go to input",
    skipToEditor: "Skip to the next planned item input",
    editTitle: "Save the next planned item",
    editHint: "Enter only one short item.",
    plannedItemInputLabel: "Next planned item",
    plannedItemPlaceholder: "Example: 3:00 PM outing",
    save: "Save",
    saved: "Saved.",
    savedStateLabel: "Saved",
    statusSuccessLabel: "Done",
    loadingTitle: "Loading",
    loading: "Loading saved data.",
    emptyStateLabel: "Not saved",
    language: "Display language",
    languageKeyboardHint: "Use arrow keys, Home, or End to switch the display language.",
    japanese: "日本語",
    english: "English",
    premiumTitle: "Premium",
    trialActive: "trial active",
    trialExpired: "Trial has ended",
    premiumActive: "Premium is active",
    trialRemaining: "remaining",
    premiumNote: "Date, weekday, and next planned item still work when Premium is inactive.",
    paymentPending: "Payment link is awaiting production setup.",
    paymentMeta: "one-time purchase",
    privacyNote: "No network communication is used. Data is saved only on this device.",
    footerScope: "This extension only displays the date, weekday, and next planned item.",
    loadErrorTitle: "Could not load data",
    loadError: "Could not load saved data. Please reload the extension.",
  },
} as const;

type TranslationKey = keyof (typeof translations)["ja"];
type ScheduleRender = (callback: () => void, milliseconds: number) => void;

export type TodayBoardAppOptions = {
  root: HTMLElement | null;
  storage: AppStorage;
  preferredLanguage?: string | null;
  now?: () => Date;
  scheduleRender?: ScheduleRender;
};

export function mountTodayBoardApp(options: TodayBoardAppOptions): void {
  if (!options.root) {
    return;
  }

  const app = new TodayBoardApp({
    ...options,
    root: options.root,
  });
  void app.initialize();
}

type MountedTodayBoardAppOptions = TodayBoardAppOptions & {
  root: HTMLElement;
};

type InitializedAppState = AppState & {
  firstOpenedAt: string;
  locale: SupportedLocale;
};

type StateCardOptions = {
  className: string;
  role: "alert" | "status";
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  ariaLive?: "polite";
};

class TodayBoardApp {
  private readonly root: HTMLElement;
  private readonly storage: AppStorage;
  private readonly preferredLanguage: string | null;
  private readonly now: () => Date;
  private readonly scheduleRender: ScheduleRender | undefined;
  private state!: InitializedAppState;
  private statusMessage = "";
  private pendingFocusId: string | null = null;
  private showFirstRunGuide = false;

  constructor(options: MountedTodayBoardAppOptions) {
    this.root = options.root;
    this.storage = options.storage;
    this.preferredLanguage = options.preferredLanguage ?? null;
    this.now = options.now ?? (() => new Date());
    this.scheduleRender = options.scheduleRender;
  }

  async initialize(): Promise<void> {
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
      this.createSkipLink(locale),
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
    const keyboardHint = element("p", "visually-hidden", text(locale, "languageKeyboardHint"));
    keyboardHint.id = "language-controls-hint";
    languageControls.setAttribute("role", "radiogroup");
    languageControls.setAttribute("aria-labelledby", "language-controls-label");
    languageControls.setAttribute("aria-describedby", "language-controls-hint");
    const jaButton = this.createLanguageButton(locale, "ja", text(locale, "japanese"));
    const enButton = this.createLanguageButton(locale, "en", text(locale, "english"));
    languageControls.addEventListener("keydown", (event) => {
      const nextLocale = getLanguageNavigationTarget(locale, event.key);
      if (!nextLocale) {
        return;
      }

      event.preventDefault();
      if (nextLocale === locale) {
        document.getElementById(`language-${nextLocale}`)?.focus();
        return;
      }

      void this.updateLocale(nextLocale);
    });
    languageControls.append(label, keyboardHint, jaButton, enButton);

    header.append(titleBlock, languageControls);
    return header;
  }

  private createSkipLink(locale: SupportedLocale): HTMLAnchorElement {
    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#planned-item";
    link.textContent = text(locale, "skipToEditor");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document.getElementById("planned-item")?.focus();
    });
    return link;
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
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(currentLocale === nextLocale));
    button.tabIndex = currentLocale === nextLocale ? 0 : -1;
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
    stateBadge.id = "planned-item-state";
    const header = element("div", "planned-card-header");
    header.append(heading, stateBadge);
    const plannedText = hasPlannedItem ? this.state.plannedItem.text : text(locale, "noPlannedItem");
    const value = element("p", hasPlannedItem ? "planned-value" : "planned-value empty", plannedText);
    value.id = "planned-item-value";
    section.setAttribute("aria-describedby", "planned-item-state planned-item-value");

    if (!hasPlannedItem) {
      const description = element("p", "empty-description", text(locale, "emptyStateDescription"));
      description.id = "empty-state-description";
      const action = document.createElement("button");
      action.type = "button";
      action.className = "secondary-button empty-action";
      action.textContent = text(locale, "emptyStateAction");
      action.setAttribute("aria-controls", "planned-item");
      action.setAttribute("aria-describedby", "empty-state-description");
      action.addEventListener("click", () => {
        document.getElementById("planned-item")?.focus();
      });
      section.setAttribute("aria-describedby", "planned-item-state planned-item-value empty-state-description");

      section.append(
        header,
        value,
        description,
        action,
      );
      return section;
    }

    section.append(header, value);
    return section;
  }

  private createEditor(locale: SupportedLocale): HTMLElement {
    const section = element("section", "editor-card");
    const heading = element("h2", "section-title", text(locale, "editTitle"));
    heading.id = "planned-item-editor-heading";
    const hint = element("p", "hint", text(locale, "editHint"));
    hint.id = "planned-item-hint";
    const limit = element("p", "hint input-limit", formatCharacterLimit(locale, MAX_PLANNED_ITEM_LENGTH));
    limit.id = "planned-item-limit";
    section.setAttribute("aria-labelledby", "planned-item-editor-heading");
    const form = document.createElement("form");
    form.className = "planned-form";
    form.setAttribute("aria-describedby", "planned-item-hint planned-item-limit");

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
    input.placeholder = text(locale, "plannedItemPlaceholder");
    input.autocomplete = "off";
    input.enterKeyHint = "done";
    input.setAttribute("aria-describedby", "planned-item-hint planned-item-limit planned-item-status");

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-button";
    saveButton.textContent = text(locale, "save");

    form.append(label, input, saveButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.savePlannedItem(input.value);
    });

    section.append(heading, hint, limit, form);

    const message = element("p", this.statusMessage ? "status-message" : "visually-hidden");
    message.id = "planned-item-status";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    message.setAttribute("aria-atomic", "true");
    if (this.statusMessage) {
      message.append(element("span", "status-label", text(locale, "statusSuccessLabel")), this.statusMessage);
    }
    section.append(message);

    return section;
  }

  private createPremiumCard(
    locale: SupportedLocale,
    premium: PremiumStatus,
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
    payment.dataset["paymentLinkPlaceholder"] = STRIPE_PAYMENT_LINK;
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

    const plannedItem: PlannedItem = {
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
    this.renderStateCard(locale, {
      className: "load-error state-card",
      role: "alert",
      titleKey: "loadErrorTitle",
      descriptionKey: "loadError",
    });
  }

  private renderLoading(locale: SupportedLocale): void {
    this.renderStateCard(locale, {
      className: "loading-card state-card",
      role: "status",
      titleKey: "loadingTitle",
      descriptionKey: "loading",
      ariaLive: "polite",
    });
  }

  private renderStateCard(locale: SupportedLocale, options: StateCardOptions): void {
    this.syncDocumentMetadata(locale);
    const card = element("section", options.className);
    card.setAttribute("role", options.role);
    if (options.ariaLive) {
      card.setAttribute("aria-live", options.ariaLive);
    }
    card.append(
      element("h1", "state-title", text(locale, options.titleKey)),
      element("p", "state-description", text(locale, options.descriptionKey)),
    );
    this.root.replaceChildren(card);
  }

  private syncDocumentMetadata(locale: SupportedLocale): void {
    document.documentElement.lang = locale;
    document.title = text(locale, "appTitle");
  }
}

function createLargeFact(idPrefix: string, label: string, value: string): HTMLElement {
  const wrapper = element("article", "large-fact");
  const labelNode = element("p", "fact-label", label);
  const valueNode = element("p", "fact-value", value);
  labelNode.id = `${idPrefix}-label`;
  valueNode.id = `${idPrefix}-value`;
  wrapper.setAttribute("aria-labelledby", `${idPrefix}-label ${idPrefix}-value`);
  wrapper.append(labelNode, valueNode);
  return wrapper;
}

function text(locale: SupportedLocale, key: TranslationKey): string {
  return translations[locale][key];
}

function formatTrialStatus(locale: SupportedLocale, daysRemaining: number): string {
  const trialLength = formatDayCountAdjective(TRIAL_DAYS, locale);
  const remainingDays = formatDayCount(daysRemaining, locale);
  if (locale === "ja") {
    return `${trialLength}${text(locale, "trialActive")}（${text(locale, "trialRemaining")}${remainingDays}）`;
  }

  return `${trialLength} ${text(locale, "trialActive")} (${remainingDays} ${text(locale, "trialRemaining")})`;
}

function formatPaymentSummary(locale: SupportedLocale, amountUsd: number): string {
  const price = formatUsdPrice(amountUsd, locale);
  if (locale === "ja") {
    return `${price}（${text(locale, "paymentMeta")}）。${text(locale, "paymentPending")}`;
  }

  return `${price} (${text(locale, "paymentMeta")}). ${text(locale, "paymentPending")}`;
}

function formatCharacterLimit(locale: SupportedLocale, maxLength: number): string {
  const formattedLength = formatInteger(maxLength, locale);
  if (locale === "ja") {
    return `最大${formattedLength}文字まで入力できます。`;
  }

  return `Up to ${formattedLength} characters.`;
}

function getLanguageNavigationTarget(
  currentLocale: SupportedLocale,
  key: string,
): SupportedLocale | null {
  if (key === "Home") {
    return "ja";
  }
  if (key === "End") {
    return "en";
  }
  if (!["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(key)) {
    return null;
  }

  return currentLocale === "ja" ? "en" : "ja";
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
