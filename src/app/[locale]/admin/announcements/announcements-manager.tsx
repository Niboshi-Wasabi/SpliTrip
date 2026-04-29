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
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "@/components/admin/admin-data-provider";
import { mutate } from "swr";
import { AnimatePresence, motion } from "framer-motion";

type Row = {
  id: string;
  title_ja: string;
  title_en: string;
  content_ja: string;
  content_en: string;
  icon_type: string;
  priority: number;
  is_published: boolean;
  expires_at: string | null;
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
  expires_at: string;
};

type TopicFormsState = Record<AnnouncementIconType, TopicFormData>;
type TopicEditingAnnouncementState = Record<AnnouncementIconType, string | null>;

const createEmptyTopicForm = (): TopicFormData => ({
  title_ja: "",
  title_en: "",
  content_ja: "",
  content_en: "",
  priority: 0,
  is_published: false,
  expires_at: "",
});

export function AnnouncementsManager() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();

  const {
    data: announcementsResponse,
    error: loadError,
    isLoading,
    mutate: refreshAnnouncements
  } = useAnnouncements();

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  const [activeTopicTab, setActiveTopicTab] = useState<AnnouncementIconType>("announcement");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [topicForms, setTopicForms] = useState<TopicFormsState>(() => {
    const initialState = {} as TopicFormsState;
    ICON_TYPES.forEach((iconTypeItem) => {
      initialState[iconTypeItem.value] = createEmptyTopicForm();
    });
    return initialState;
  });
  const [topicEditingAnnouncementIds, setTopicEditingAnnouncementIds] =
    useState<TopicEditingAnnouncementState>(() => {
      const initialState = {} as TopicEditingAnnouncementState;
      ICON_TYPES.forEach((iconTypeItem) => {
        initialState[iconTypeItem.value] = null;
      });
      return initialState;
    });

  const toDateTimeLocalValue = (isoTimestamp: string | null): string => {
    if (!isoTimestamp) {
      return "";
    }
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  };

  const formatExpiryLabel = (isoTimestamp: string | null): string => {
    if (!isoTimestamp) {
      return locale === "en" ? "No expiry" : "期限なし";
    }
    const date = new Date(isoTimestamp);
    if (Number.isNaN(date.getTime())) {
      return locale === "en" ? "No expiry" : "期限なし";
    }
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const iconTypeMap = useMemo(
    () => new Map(ICON_TYPES.map((iconTypeItem) => [iconTypeItem.value, iconTypeItem])),
    [],
  );

  const activeTopicConfig = iconTypeMap.get(activeTopicTab);
  const ActiveTopicIcon = activeTopicConfig?.icon ?? Megaphone;
  const currentTopicForm = topicForms[activeTopicTab];

  const rows = useMemo(() => {
    if (announcementsResponse?.ok && announcementsResponse?.items) {
      return announcementsResponse.items as Row[];
    }
    return [];
  }, [announcementsResponse]);

  const displayError = useMemo(() => {
    if (loadError) {
      return t("announcementLoadError");
    }
    return null;
  }, [loadError, t]);

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
    setTopicEditingAnnouncementIds((currentEditingIds) => ({
      ...currentEditingIds,
      [topicType]: null,
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
        expires_at: formData.expires_at
          ? new Date(formData.expires_at).toISOString()
          : null,
      };
      const editingAnnouncementId = topicEditingAnnouncementIds[topicType];
      const isEditingMode = typeof editingAnnouncementId === "string";
      const requestUrl = isEditingMode
        ? `/api/admin/announcements/${editingAnnouncementId}`
        : "/api/admin/announcements";
      const requestMethod = isEditingMode ? "PUT" : "POST";

      const response = await fetch(requestUrl, {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        setActionError(
          locale === "en"
            ? isEditingMode
              ? "Failed to update announcement."
              : "Failed to save announcement."
            : isEditingMode
              ? "お知らせの更新に失敗しました。"
              : "保存に失敗しました。",
        );
        return;
      }

      resetTopicForm(topicType);
      await refreshAnnouncements();
      mutate("/api/admin/announcements");
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
      const response = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        if (responseBody?.message === "not_found") {
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
      await refreshAnnouncements();
      mutate("/api/admin/announcements");
      router.refresh();
    } finally {
      setDeletingAnnouncementId(null);
      setBusy(false);
    }
  }

  const getAnnouncementsByTopic = useCallback(
    (topicType: AnnouncementIconType) => {
      return rows.filter((row) => row.icon_type === topicType);
    },
    [rows],
  );

  const renderTopicForm = (topicType: AnnouncementIconType) => {
    const topicConfig = iconTypeMap.get(topicType);
    const formData = topicForms[topicType];
    const editingAnnouncementId = topicEditingAnnouncementIds[topicType];
    const isEditingMode = typeof editingAnnouncementId === "string";
    const TopicIcon = topicConfig?.icon ?? Megaphone;
    const topicAnnouncements = getAnnouncementsByTopic(topicType);

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-3">
            <TopicIcon className={`h-5 w-5 ${topicConfig?.color ?? ""}`} />
            <h3 className="font-medium">
              {locale === "en" ? topicConfig?.labelEn : topicConfig?.labelJa}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {topicConfig?.description}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium">
              {isEditingMode ? "編集（上書き保存）" : "新規作成"}
            </h2>

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
              <Label htmlFor={`expires_${topicType}`}>公開期限（任意）</Label>
              <Input
                id={`expires_${topicType}`}
                type="datetime-local"
                value={formData.expires_at}
                onChange={(event) =>
                  updateTopicForm(topicType, { expires_at: event.target.value })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                未設定なら無期限で公開されます。
              </p>
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
                className="min-h-[44px] gap-1.5"
              >
                {isEditingMode ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isEditingMode ? "上書き保存" : "作成"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetTopicForm(topicType)}
                disabled={busy}
                className="min-h-[44px]"
              >
                {isEditingMode ? "編集をキャンセル" : "クリア"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium">
              {t("announcementPreview")}
            </h2>
            <div className="space-y-4 rounded-lg border border-border bg-background/70 p-4">
              <div className="space-y-2 rounded-lg border border-border bg-zinc-900/40 p-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {t("announcementBannerPreview")}
                </p>
                <button
                  type="button"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left"
                  onClick={() => setPreviewModalOpen(true)}
                >
                  <div className="flex items-center gap-2">
                    <TopicIcon className={`h-4 w-4 ${topicConfig?.color ?? ""}`} />
                    <Badge
                      variant={formData.is_published ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {formData.is_published
                        ? t("announcementPublishedBadge")
                        : t("announcementDraftBadge")}
                    </Badge>
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {(formData.title_ja || "").trim() || t("announcementPreviewUntitled")}
                    </p>
                  </div>
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-border bg-zinc-950 p-3 text-zinc-100">
                <p className="text-xs uppercase tracking-widest text-zinc-400">
                  {t("announcementModalPreview")}
                </p>
                <p className="text-base font-semibold leading-tight">
                  {(formData.title_ja || "").trim() || t("announcementPreviewUntitled")}
                </p>
                <p className="text-xs text-zinc-400">
                  {(formData.title_en || "").trim() || t("announcementPreviewNoEnglishTitle")}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">
                  {(formData.content_ja || "").trim() || t("announcementPreviewEmptyBody")}
                </p>
                <p className="whitespace-pre-wrap break-words text-xs text-zinc-400">
                  {(formData.content_en || "").trim() || t("announcementPreviewNoEnglishBody")}
                </p>
                <p className="text-xs text-zinc-500">
                  {t("announcementPreviewExpiry", {
                    expiry: formData.expires_at
                      ? formatExpiryLabel(new Date(formData.expires_at).toISOString())
                      : t("announcementPreviewNoExpiry"),
                  })}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {previewModalOpen ? (
                <motion.div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100 shadow-2xl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold leading-tight">
                      {(formData.title_ja || "").trim() || t("announcementPreviewUntitled")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewModalOpen(false)}
                    >
                      {t("announcementClosePreview")}
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">
                    {(formData.content_ja || "").trim() || t("announcementPreviewEmptyBody")}
                  </p>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

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
                            <Badge variant="outline" className="w-fit text-[10px]">
                              {locale === "en" ? "Expiry" : "期限"}:{" "}
                              {formatExpiryLabel(announcementRow.expires_at)}
                            </Badge>
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
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="text-destructive min-h-[44px] min-w-[44px]"
                            aria-label={t("announcementDelete")}
                            onClick={() => void remove(announcementRow.id)}
                            disabled={busy || deletingAnnouncementId === announcementRow.id}
                          >
                            <Trash2 className="h-4 w-4" />
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
      setActiveTopicTab(topicType);
      updateTopicForm(topicType, {
        title_ja: announcementRow.title_ja,
        title_en: announcementRow.title_en,
        content_ja: announcementRow.content_ja ?? "",
        content_en: announcementRow.content_en ?? "",
        priority: announcementRow.priority ?? 0,
        is_published: announcementRow.is_published,
        expires_at: toDateTimeLocalValue(announcementRow.expires_at),
      });
      setTopicEditingAnnouncementIds((currentEditingIds) => ({
        ...currentEditingIds,
        [topicType]: announcementRow.id,
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {displayError ? (
            <p className="text-sm text-destructive" role="alert">
              {displayError}
            </p>
          ) : null}
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshAnnouncements()}
          disabled={isLoading}
          className="min-h-[44px] gap-1.5"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          更新
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
                  "flex min-h-[44px] items-center justify-start gap-1.5 px-3 py-2 text-xs",
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

        <div>
          {renderTopicForm(activeTopicTab)}
        </div>
      </div>

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
                              <Badge variant="outline" className="w-fit text-[10px]">
                                {locale === "en" ? "Expiry" : "期限"}:{" "}
                                {formatExpiryLabel(announcementRow.expires_at)}
                              </Badge>
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
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="text-destructive min-h-[44px] min-w-[44px]"
                            aria-label={t("announcementDelete")}
                            onClick={() => void remove(announcementRow.id)}
                            disabled={busy || deletingAnnouncementId === announcementRow.id}
                          >
                            <Trash2 className="h-4 w-4" />
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