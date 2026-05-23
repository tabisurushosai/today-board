# Porting guide

このプロジェクトは現在 Chrome 拡張として配布しますが、将来の iOS /
Android シェルでも再利用できるように、アプリのロジックを小さな
プラットフォーム境界の内側に保ちます。

## モジュール境界

- `src/core/` は純粋なアプリケーションロジックと共有型だけを置きます。
  - `chrome.*`、DOM グローバル、ネットワーク API、プラットフォーム SDK
    を import しないでください。
  - 日付、Premium、予定、状態の helper は決定的にし、どの JavaScript
    ランタイムからでも呼べる状態を維持します。
- `src/storage/` は保存アダプタとシリアライズを担当します。
  - UI コードは `src/storage/appStorage.ts` の `AppStorage` interface に
    依存します。
  - プラットフォーム固有コードは、アプリ状態を直接読み書きせず、この
    interface を実装します。
  - `serialization.ts` は現在の保存キー
    `plannedItemText`、`plannedItemUpdatedAt`、`firstOpenedAt`、
    `premiumPurchasedAt`、`locale` を維持します。
- `src/ui/` は DOM レンダリングを担当し、プラットフォームサービスは
  options 経由で受け取ります。
  - ブラウザグローバルは entry point または UI / platform adapter 内に
    閉じ込めます。
  - 文言や挙動は、特定ブラウザ API ではなく端末ローカル保存を表す表現に
    寄せます。

## 新しいプラットフォーム保存アダプタを追加する場合

iOS / Android wrapper では、次の interface を実装する adapter を追加します。

```ts
interface AppStorage {
  load(): Promise<AppState>;
  save(patch: AppStatePatch): Promise<void>;
}
```

同じ key/value 形状で保存できる場合は、`src/storage/serialization.ts` の
`deserializeAppState` と `serializeAppStatePatch` を再利用してください。
ネイティブ保存層の物理的な backend が異なる場合も、既存データを core や
UI の変更なしで移行できるよう、論理キーと値の意味は変えません。

## Chrome 拡張の entry point

`src/main.ts` は Chrome 拡張の composition root です。ここで次を配線します。

- `chrome.storage.local` 用の `ChromeLocalStorageAdapter`
- DOM root lookup
- `navigator.language`
- `window.setInterval`

将来のアプリ entry point は、`src/core/` を変更せず、各 platform shell から
同等のサービスを渡してください。

## 維持する制約

- 移植性対応のために permissions / host_permissions を追加しません。
- remote code、`eval`、外部 CDN、外部フォント、ネットワーク通信を追加しません。
- 完全オフライン動作を維持します。
- 現在の保存キーと意味を維持します。
