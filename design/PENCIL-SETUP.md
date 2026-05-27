# Pencil セットアップ（SpliTrip）

このリポジトリで Pencil を使うための初回チェックリストです。

## 1. 拡張機能

1. Cursor → **Extensions** → 「Pencil」を検索してインストール
2. 有効化されていることを確認

## 2. 動作確認

1. `design/screens/dashboard.pen` を開く
2. エディタ右上に **Pencil アイコン** が表示されること
3. キャンバスにコンポーネントが見えること

### 「Failed to open *.pen」が出る場合

- ルートに `"version": "2.10"` があるか
- ドキュメント内の **`id` が重複していないか**
- JSON が壊れていないか（末尾カンマなし）

修正後はファイルを保存し、タブを閉じてから再度開いてください。

## 3. MCP 接続（Cursor Agent 連携）

1. Pencil 拡張が起動している状態で `.pen` を開く
2. Cursor → **Settings → Tools & MCP**
3. **Pencil** MCP サーバーが一覧にあり、接続済みであること
4. 利用可能ツールの例: `batch_design`, `batch_get`, `get_variables`, `set_variables`, `get_screenshot`

## 4. Agent への依頼テンプレート

```
@.cursor/rules/ui-design.mdc @design/tokens.json @design/screens/dashboard.pen
ui-design.mdc と tokens.json に従い、dashboard.pen のモバイルフレームを更新してください。
```

## 5. 保存と Git

- Pencil は **自動保存未対応** のため `Ctrl+S` / `Cmd+S` をこまめに
- `design/**/*.pen` は通常のソースと同様に commit する
