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
  - `npm run build` は `tsconfig.core.json` で `src/core/**/*.ts` を
    DOM / Chrome 型なしでも型検査します。移植性を保つため、この確認を
    外さないでください。
- `src/storage/` は保存アダプタとシリアライズを担当します。
  - UI コードは `src/storage/appStorage.ts` の `AppStorage` interface に
    依存します。
  - プラットフォーム固有コードはアプリ状態を直接読み書きせず、
    `StorageAdapter` で raw key/value の読み書きだけを実装します。
    `createAppStorage(adapter)` が既存の保存データ形式と `AppState` の
    相互変換を担当します。
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

iOS / Android wrapper では、次の raw 保存 adapter を実装して
`createAppStorage(adapter)` に渡します。UI へ渡すのは作成済みの
`AppStorage` です。

```ts
type StorageRecord = Record<string, unknown>;
type SerializedAppStatePatch = Record<string, string | null>;

interface StorageAdapter {
  readAll(): Promise<StorageRecord>;
  write(patch: SerializedAppStatePatch): Promise<void>;
}
```

同じ key/value 形状で保存できる場合は、`src/storage/serialization.ts` の
`deserializeAppState` と `serializeAppStatePatch` を再利用してください。
ネイティブ保存層の物理的な backend が異なる場合も、既存データを core や
UI の変更なしで移行できるよう、論理キーと値の意味は変えません。

## Chrome 拡張の entry point

`src/main.ts` は Chrome 拡張の composition root です。ここで次を配線します。

- `chrome.storage.local` 用の `ChromeLocalStorageAdapter`
- `createAppStorage(new ChromeLocalStorageAdapter())`
- DOM root lookup
- `navigator.language`
- `window.setInterval`

将来のアプリ entry point は、`src/core/` を変更せず、各 platform shell から
同等のサービスを渡してください。

## iOS / Android シェルでの移植メモ

- ネイティブ側の保存 API（UserDefaults、SharedPreferences、SQLite など）は
  `StorageAdapter` の内側に閉じ込め、`src/core/` や `src/ui/` へ直接渡しません。
- 保存値は既存と同じ論理 key/value のまま扱います。日付文字列は現在と同じ
  ISO 文字列を保存し、空文字は未保存として扱います。
- UI を差し替える場合も、`AppStorage`、`preferredLanguage`、`now`、
  `scheduleRender` のような小さなサービスを entry point で注入し、純ロジックを
  platform shell へ寄せないでください。

## 維持する制約

- 移植性対応のために permissions / host_permissions を追加しません。
- remote code、`eval`、外部 CDN、外部フォント、ネットワーク通信を追加しません。
- 完全オフライン動作を維持します。
- 現在の保存キーと意味を維持します。
