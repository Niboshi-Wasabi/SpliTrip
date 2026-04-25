"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Plus,
  Trash2,
  Star,
  Bug,
  Megaphone,
  Palette,
  Shield,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string;
  priority: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const ICON_TYPES = [
  {
    value: "announcement",
    labelJa: "お知らせ",
    labelEn: "Announcement",
    icon: Megaphone,
    color: "text-blue-600 dark:text-blue-400",
    description: "一般的なお知らせやアップデート情報",
  },
  {
    value: "feature",
    labelJa: "新機能",
    labelEn: "Feature",
    icon: Star,
    color: "text-emerald-600 dark:text-emerald-400",
    description: "新機能の追加やサービス拡張のお知らせ",
  },
  {
    value: "bugfix",
    labelJa: "バグ修正",
    labelEn: "Bugfix",
    icon: Bug,
    color: "text-orange-600 dark:text-orange-400",
    description: "バグ修正や不具合解消のお知らせ",
  },
  {
    value: "design",
    labelJa: "デザイン",
    labelEn: "Design",
    icon: Palette,
    color: "text-violet-600 dark:text-violet-400",
    description: "UI/UXの改善やデザイン変更のお知らせ",
  },
  {
    value: "security",
    labelJa: "セキュリティ",
    labelEn: "Security",
    icon: Shield,
    color: "text-red-600 dark:text-red-400",
    description: "セキュリティ強化や認証に関するお知らせ",
  },
  {
    value: "maintenance",
    labelJa: "メンテナンス",
    labelEn: "Maintenance",
    icon: Wrench,
    color: "text-zinc-600 dark:text-zinc-400",
    description: "システムメンテナンスや一時停止のお知らせ",
  },
] as const;

type AnnouncementIconType = (typeof ICON_TYPES)[number]["value"];

type TopicFormData = {
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  priority: number;
  is_published: boolean;
};

type TopicFormsState = Record<AnnouncementIconType, TopicFormData>;

const createEmptyTopicForm = (): TopicFormData => ({
  title_ja: "",
  title_en: "",
  content_ja: "",
  content_en: "",
  priority: 0,
  is_published: false,
});

export function AnnouncementsManager() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  const [activeTopicTab, setActiveTopicTab] = useState<AnnouncementIconType>("announcement");
  
  // 各トピック毎のフォームデータ
  const [topicForms, setTopicForms] = useState<TopicFormsState>(() => {
    const initialState = {} as TopicFormsState;
    ICON_TYPES.forEach((iconTypeItem) => {
      initialState[iconTypeItem.value] = createEmptyTopicForm();
    });
    return initialState;
  });

  const iconTypeMap = useMemo(
    () => new Map(ICON_TYPES.map((iconTypeItem) => [iconTypeItem.value, iconTypeItem])),
    [],
  );

  const activeTopicConfig = iconTypeMap.get(activeTopicTab);
  const ActiveTopicIcon = activeTopicConfig?.icon ?? Megaphone;
  const currentTopicForm = topicForms[activeTopicTab];

  const load = useCallback(async () => {
    setLoadError(null);
    setActionError(null);
    const res = await fetch("/api/admin/announcements", { cache: "no-store" });
    const jsonResponse = (await res.json().catch(() => null)) as
      | { ok?: boolean; items?: Row[]; message?: string }
      | null;
    if (!res.ok || !jsonResponse?.ok) {
      if (jsonResponse?.message === "step_up_required") {
        setLoadError(t("stepUpRequiredError"));
        return;
      }
      setLoadError(t("announcementLoadError"));
      return;
    }
    setRows((jsonResponse.items ?? []) as Row[]);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateTopicForm = useCallback(
    (topicType: AnnouncementIconType, updates: Partial<TopicFormData>) => {
      setTopicForms((currentForms) => ({
        ...currentForms,
        [topicType]: { ...currentForms[topicType], ...updates },
      }));
    },
    [],
  );

  const resetTopicForm = useCallback((topicType: AnnouncementIconType) => {
    setTopicForms((currentForms) => ({
      ...currentForms,
      [topicType]: createEmptyTopicForm(),
    }));
  }, []);

  async function saveTopicAnnouncement(topicType: AnnouncementIconType) {
    setActionError(null);
    setBusy(true);
    try {
      const formData = topicForms[topicType];
      const payload = {
        ...formData,
        icon_type: topicType,
      };

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setActionError(
          locale === "en" ? "Failed to save announcement." : "保存に失敗しました。",
        );
        return;
      }

      resetTopicForm(topicType);
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(announcementId: string) {
    if (!window.confirm(t("announcementDeleteConfirm"))) {
      return;
    }
    setActionError(null);
    setBusy(true);
    setDeletingAnnouncementId(announcementId);
    try {
      const res = await fetch(`/api/admin/announcements/${announcementId}`, { 
        method: "DELETE" 
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        if (payload?.message === "not_found") {
          setActionError(
            locale === "en"
              ? "This announcement no longer exists."
              : "対象のお知らせが見つかりませんでした。",
          );
        } else {
          setActionError(
            locale === "en" ? "Failed to delete announcement." : "削除に失敗しました。",
          );
        }
        return;
      }
      await load();
      router.refresh();
    } finally {
      setDeletingAnnouncementId(null);
      setBusy(false);
    }
  }

  // トピック毎のお知らせをフィルタ
  const getAnnouncementsByTopic = useCallback(
    (topicType: AnnouncementIconType) => {
      return rows.filter((row) => row.icon_type === topicType);
    },
    [rows],
  );

  const renderTopicForm = (topicType: AnnouncementIconType) => {
    const topicConfig = iconTypeMap.get(topicType);
    const formData = topicForms[topicType];
    const TopicIcon = topicConfig?.icon ?? Megaphone;
    const topicAnnouncements = getAnnouncementsByTopic(topicType);

    return (
      <div className="space-y-6">
        {/* トピック説明 */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TopicIcon className={`h-5 w-5 ${topicConfig?.color ?? ""}`} />
            <h3 className="font-medium">
              {locale === "en" ? topicConfig?.labelEn : topicConfig?.labelJa}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {topicConfig?.description}
          </p>
        </div>

        {/* 作成・プレビューセクション */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 編集フォーム */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">編集</h2>
            
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor={`tja_${topicType}`}>タイトル（日本語）</Label>
                <Input
                  id={`tja_${topicType}`}
                  value={formData.title_ja}
                  onChange={(event) =>
                    updateTopicForm(topicType, { title_ja: event.target.value })
                  }
                  placeholder="日本語のタイトルを入力"
                />
              </div>
              <div>
                <Label htmlFor={`ten_${topicType}`}>タイトル（英語）</Label>
                <Input
                  id={`ten_${topicType}`}
                  value={formData.title_en}
                  onChange={(event) =>
                    updateTopicForm(topicType, { title_en: event.target.value })
                  }
                  placeholder="English title"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`cja_${topicType}`}>本文（日本語）</Label>
              <textarea
                id={`cja_${topicType}`}
                rows={5}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={formData.content_ja}
                onChange={(event) =>
                  updateTopicForm(topicType, { content_ja: event.target.value })
                }
                placeholder="日本語の本文を入力"
              />
            </div>

            <div>
              <Label htmlFor={`cen_${topicType}`}>本文（英語）</Label>
              <textarea
                id={`cen_${topicType}`}
                rows={5}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={formData.content_en}
                onChange={(event) =>
                  updateTopicForm(topicType, { content_en: event.target.value })
                }
                placeholder="English content"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor={`priority_${topicType}`}>優先度</Label>
                <select
                  id={`priority_${topicType}`}
                  value={formData.priority}
                  onChange={(event) =>
                    updateTopicForm(topicType, {
                      priority: parseInt(event.target.value, 10),
                    })
                  }
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <option value={0}>通常</option>
                  <option value={1}>高</option>
                  <option value={2}>緊急</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pub_${topicType}`}
                    className="h-4 w-4 rounded border-border"
                    checked={formData.is_published}
                    onChange={(event) =>
                      updateTopicForm(topicType, {
                        is_published: event.target.checked,
                      })
                    }
                  />
                  <Label htmlFor={`pub_${topicType}`}>公開する</Label>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void saveTopicAnnouncement(topicType)}
                disabled={busy}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                作成
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetTopicForm(topicType)}
                disabled={busy}
              >
                クリア
              </Button>
            </div>
          </div>

          {/* プレビュー */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">
              {locale === "en" ? "Preview" : "プレビュー"}
            </h2>
            <div className="rounded-lg border border-border bg-background/70 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <TopicIcon className={`mt-0.5 h-5 w-5 ${topicConfig?.color ?? ""}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-tight">
                      {(formData.title_ja || "").trim() || "（タイトル未入力）"}
                    </p>
                    {formData.priority > 0 ? (
                      <Badge
                        variant={formData.priority === 2 ? "destructive" : "default"}
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        {formData.priority === 2 ? "緊急" : "高"}
                      </Badge>
                    ) : null}
                    <Badge variant={formData.is_published ? "default" : "secondary"}>
                      {formData.is_published
                        ? t("announcementPublishedBadge")
                        : t("announcementDraftBadge")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(formData.title_en || "").trim() || "No English title"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {(formData.content_ja || "").trim() || "（本文未入力）"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {(formData.content_en || "").trim() || "No English content"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* このトピックの既存お知らせ一覧 */}
        {topicAnnouncements.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <TopicIcon className={`h-4 w-4 ${topicConfig?.color ?? ""}`} />
              既存の{locale === "en" ? topicConfig?.labelEn : topicConfig?.labelJa}
              （{topicAnnouncements.length}件）
            </h3>
            <div className="max-h-[min(40vh,320px)] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead className="w-24">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicAnnouncements.map((announcementRow) => (
                    <TableRow key={announcementRow.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {announcementRow.title_ja || "—"}
                            </span>
                            {announcementRow.priority > 0 && (
                              <Badge
                                variant={
                                  announcementRow.priority === 2 ? "destructive" : "default"
                                }
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {announcementRow.priority === 2 ? "緊急" : "高"}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {announcementRow.title_en || "—"}
                          </span>
                          <div className="flex gap-1">
                            {announcementRow.is_published ? (
                              <Badge variant="default" className="w-fit text-[10px]">
                                {t("announcementPublishedBadge")}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="w-fit text-[10px]">
                                {t("announcementDraftBadge")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={t("announcementEdit")}
                            onClick={() => editExistingAnnouncement(announcementRow)}
                            disabled={busy}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="text-destructive h-8 w-8"
                            aria-label={t("announcementDelete")}
                            onClick={() => void remove(announcementRow.id)}
                            disabled={busy || deletingAnnouncementId === announcementRow.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const editExistingAnnouncement = (announcementRow: Row) => {
    const topicType = announcementRow.icon_type as AnnouncementIconType;
    if (iconTypeMap.has(topicType)) {
      // 該当トピックタブに切り替えてフォームに既存データを設定
      setActiveTopicTab(topicType);
      updateTopicForm(topicType, {
        title_ja: announcementRow.title_ja,
        title_en: announcementRow.title_en,
        content_ja: announcementRow.content_ja ?? "",
        content_en: announcementRow.content_en ?? "",
        priority: announcementRow.priority ?? 0,
        is_published: announcementRow.is_published,
      });
      
      // 編集中の既存IDを保持（更新時に使用）
      // TODO: 編集機能の実装が必要な場合は、ここでeditingIdのstateを追加
    }
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
      
      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* トピック別ナビゲーション */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {ICON_TYPES.map((iconTypeItem) => {
            const Icon = iconTypeItem.icon;
            const topicAnnouncements = getAnnouncementsByTopic(iconTypeItem.value);
            const isActive = activeTopicTab === iconTypeItem.value;
            return (
              <Button
                key={iconTypeItem.value}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-1.5 text-xs h-auto py-2 px-3 justify-start",
                  isActive && "ring-2 ring-ring ring-offset-2"
                )}
                onClick={() => setActiveTopicTab(iconTypeItem.value as AnnouncementIconType)}
              >
                <Icon className={`h-3 w-3 ${iconTypeItem.color}`} />
                <span className="hidden sm:inline truncate">
                  {locale === "en" ? iconTypeItem.labelEn : iconTypeItem.labelJa}
                </span>
                {topicAnnouncements.length > 0 && (
                  <Badge variant="secondary" className="ml-auto h-4 min-w-4 px-1 text-[10px]">
                    {topicAnnouncements.length}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* アクティブトピックのフォーム */}
        <div>
          {renderTopicForm(activeTopicTab)}
        </div>
      </div>

      {/* 全体の一覧（オプション - 必要に応じて表示/非表示） */}
      {rows.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            全お知らせ一覧を表示（{rows.length}件）
          </summary>
          <div className="max-h-[min(50vh,400px)] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((announcementRow) => {
                  const rowIconType = iconTypeMap.get(
                    announcementRow.icon_type as AnnouncementIconType,
                  );
                  const RowIcon = rowIconType?.icon ?? Megaphone;
                  return (
                    <TableRow key={announcementRow.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <RowIcon
                              className={`h-4 w-4 ${rowIconType?.color ?? "text-blue-600 dark:text-blue-400"}`}
                            />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {announcementRow.title_ja || "—"}
                              </span>
                              {announcementRow.priority > 0 && (
                                <Badge
                                  variant={
                                    announcementRow.priority === 2 ? "destructive" : "default"
                                  }
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  {announcementRow.priority === 2 ? "緊急" : "高"}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {announcementRow.title_en || "—"}
                            </span>
                            <div className="flex gap-1">
                              {announcementRow.is_published ? (
                                <Badge variant="default" className="w-fit text-[10px]">
                                  {t("announcementPublishedBadge")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="w-fit text-[10px]">
                                  {t("announcementDraftBadge")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            aria-label={t("announcementEdit")}
                            onClick={() => editExistingAnnouncement(announcementRow)}
                            disabled={busy}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="text-destructive h-8 w-8"
                            aria-label={t("announcementDelete")}
                            onClick={() => void remove(announcementRow.id)}
                            disabled={busy || deletingAnnouncementId === announcementRow.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </details>
      )}
    </div>
  );
}