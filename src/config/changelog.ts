export type ChangelogEntry = {
  iconName: "sparkles" | "gift" | "rocket";
  title: string;
  description: string;
};

export const APP_CHANGELOG_VERSION = "v1.1.0";

export const APP_CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    iconName: "sparkles",
    title: "新しい「特定商取引法に基づく表記」ページを追加",
    description:
      "法務情報を見つけやすく整理し、ログイン画面やダッシュボードからアクセスできるようになりました。",
  },
  {
    iconName: "gift",
    title: "PROプラン画面を準備中表示に変更",
    description:
      "Stripe審査対応のため、課金導線は一時的に「Coming Soon」で表示しています。将来の再開に向けた基盤は維持しています。",
  },
  {
    iconName: "rocket",
    title: "アプリ内のお知らせ表示を追加",
    description:
      "更新があったときに、初回アクセス時だけ「What's New」モーダルで新機能を確認できるようになりました。",
  },
];
