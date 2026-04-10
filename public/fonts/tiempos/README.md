# Tiempos（アルファベット用プロポーショナル）

`globals.css` の `@font-face` は次のパスを参照します（すべて **WOFF2**）。

- `TiemposText-Regular.woff2`（`font-weight: 400`）
- `TiemposText-Medium.woff2`（`font-weight: 500`）
- `TiemposText-Semibold.woff2`（`font-weight: 600`）
- `TiemposText-Bold.woff2`（`font-weight: 700`）

## 入手とライセンス

Tiempos は **Klim Type Foundry** の商業フォントです。Web 用 WOFF2 はライセンス購入後に配布されるファイルを、このディレクトリに上記名で配置してください（実ファイル名が異なる場合はリネームするか、`globals.css` の `url()` を合わせてください）。

リポジトリにはフォントバイナリを含めません。未配置の場合、ブラウザはスタックの次候補（Geist / Noto）にフォールバックします。
