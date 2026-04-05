/** 金額を日本円の表示形式（¥1,000）にフォーマットする */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}
