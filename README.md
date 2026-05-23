# きょうボード (today-board)

Displays today's date, day of week and the next planned item in large text to support orientation for seniors.

## 単一用途

高齢者の見当識を支えるため、今日の日付・曜日・次の予定を大きな文字で表示します。

## 機能

- 今日の日付と曜日を大きく高コントラストで表示
- 次の予定を1件だけ保存して大きく表示
- 日本語デフォルト、英語表示に切り替え可能
- 完全オフライン動作
- 保存先はこの端末の `chrome.storage.local` のみ
- Premium $3 買い切り、7日間トライアル判定の枠組み

Premiumが無効でも、日付・曜日・次の予定の基本表示は動作します。支払いリンクは `STRIPE_PAYMENT_LINK` 定数の本番設定待ちです。

## 非医療の範囲

この拡張は非医療の生活支援ツールです。診断、治療、医療助言、医療効果や健康改善の主張は行いません。薬名、用量、効果、服薬指示は扱いません。発信、通話、メッセージ送信機能はありません。

## 開発

```bash
npm install
npm run generate:icons
npm run build
```

`npm run build` により `dist/` が生成され、Chrome Web Store提出用の `manifest.json`、`_locales/ja`、`_locales/en`、`icons/icon16.png`、`icons/icon48.png`、`icons/icon128.png` が含まれます。

## Chromeでの確認

1. `npm run build` を実行します。
2. Chromeで `chrome://extensions` を開きます。
3. 「デベロッパーモード」をオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」から `dist/` を選択します。
5. 新しいタブ、または拡張アイコンのポップアップで表示を確認します。

## 権限とプライバシー

- `manifest_version`: 3
- `permissions`: `storage` のみ
- `host_permissions`: なし
- API/ネットワーク通信: なし
- remote code/eval: なし

詳細は [legal/PRIVACY.md](legal/PRIVACY.md) と [legal/DISCLAIMER.md](legal/DISCLAIMER.md) を参照してください。
