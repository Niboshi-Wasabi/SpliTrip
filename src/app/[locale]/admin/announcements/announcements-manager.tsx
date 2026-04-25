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
  },
  {
    value: "feature",
    labelJa: "新機能",
    labelEn: "Feature",
    icon: Star,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "bugfix",
    labelJa: "バグ修正",
    labelEn: "Bugfix",
    icon: Bug,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    value: "design",
    labelJa: "デザイン",
    labelEn: "Design",
    icon: Palette,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    value: "security",
    labelJa: "セキュリティ",
    labelEn: "Security",
    icon: Shield,
    color: "text-red-600 dark:text-red-400",
  },
  {
    value: "maintenance",
    labelJa: "メンテナンス",
    labelEn: "Maintenance",
    icon: Wrench,
    color: "text-zinc-600 dark:text-zinc-400",
  },
] as const;

type AnnouncementIconType = (typeof ICON_TYPES)[number]["value"];
const DEFAULT_ANNOUNCEMENT_ICON_TYPE: AnnouncementIconType = "announcement";

function normalizeAnnouncementIconType(iconType: string): AnnouncementIconType {
  if (ICON_TYPES.some((iconTypeItem) => iconTypeItem.value === iconType)) {
    return iconType as AnnouncementIconType;
  }
  return DEFAULT_ANNOUNCEMENT_ICON_TYPE;
}

export function AnnouncementsManager() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [draft, setDraft] = useState({
    title_ja: "",
    title_en: "",
    content_ja: "",
    content_en: "",
    icon_type: DEFAULT_ANNOUNCEMENT_ICON_TYPE,
    priority: 0,
    is_published: false,
  });

  const iconTypeMap = useMemo(
    () =>
      new Map(
        ICON_TYPES.map((iconTypeItem) => [iconTypeItem.value, iconTypeItem]),
      ),
    [],
  );

  const selectedIconType =
    iconTypeMap.get(draft.icon_type) ??
    iconTypeMap.get(DEFAULT_ANNOUNCEMENT_ICON_TYPE);
  const PreviewIcon = selectedIconType?.icon ?? Megaphone;

  const load = useCallback(async () => {
    setLoadError(null);
    setActionError(null);
    const res = await fetch("/api/admin/announcements", { cache: "no-store" });
    const j = (await res.json().catch(() => null)) as
      | { ok?: boolean; items?: Row[]; message?: string }
      | null;
    if (!res.ok || !j?.ok) {
      if (j?.message === "step_up_required") {
        setLoadError(t("stepUpRequiredError"));
        return;
      }
      setLoadError(t("announcementLoadError"));
      return;
    }
    setRows((j.items ?? []) as Row[]);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setActionError(null);
    setEditing("new");
    setDraft({
      title_ja: "",
      title_en: "",
      content_ja: "",
      content_en: "",
      icon_type: DEFAULT_ANNOUNCEMENT_ICON_TYPE,
      priority: 0,
      is_published: false,
    });
  }

  function openEdit(row: Row) {
    setActionError(null);
    setEditing(row);
    setDraft({
      title_ja: row.title_ja,
      title_en: row.title_en,
      content_ja: row.content_ja ?? "",
      content_en: row.content_en ?? "",
      icon_type: normalizeAnnouncementIconType(row.icon_type),
      priority: row.priority ?? 0,
      is_published: row.is_published,
    });
  }

  async function save() {
    setActionError(null);
    setBusy(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          setActionError(
            locale === "en" ? "Failed to save announcement." : "保存に失敗しました。",
          );
          return;
        }
        setEditing(null);
        await load();
        router.refresh();
        return;
      }
      if (editing && typeof editing === "object") {
        const res = await fetch(`/api/admin/announcements/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          setActionError(
            locale === "en" ? "Failed to update announcement." : "更新に失敗しました。",
          );
          return;
        }
        setEditing(null);
        await load();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("announcementDeleteConfirm"))) {
      return;
    }
    setActionError(null);
    setBusy(true);
    setDeletingAnnouncementId(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
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
      <div className="flex justify-end">
        <Button type="button" onClick={openNew} className="gap-1.5" disabled={busy}>
          <Plus className="h-4 w-4" />
          {t("announcementNew")}
        </Button>
      </div>
      {editing ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">編集</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="tja">{t("announcementTitleJa")}</Label>
                <Input
                  id="tja"
                  value={draft.title_ja}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      title_ja: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="ten">{t("announcementTitleEn")}</Label>
                <Input
                  id="ten"
                  value={draft.title_en}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      title_en: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cja">{t("announcementContentJa")}</Label>
              <textarea
                id="cja"
                rows={5}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={draft.content_ja}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    content_ja: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="cen">{t("announcementContentEn")}</Label>
              <textarea
                id="cen"
                rows={5}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                value={draft.content_en}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    content_en: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="iconType">アイコンタイプ</Label>
                <select
                  id="iconType"
                  value={draft.icon_type}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      icon_type: event.target.value as AnnouncementIconType,
                    }))
                  }
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {ICON_TYPES.map((iconTypeItem) => (
                    <option key={iconTypeItem.value} value={iconTypeItem.value}>
                      {locale === "en" ? iconTypeItem.labelEn : iconTypeItem.labelJa}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="priority">優先度</Label>
                <select
                  id="priority"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      priority: parseInt(event.target.value, 10),
                    }))
                  }
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <option value={0}>通常</option>
                  <option value={1}>高</option>
                  <option value={2}>緊急</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pub"
                className="h-4 w-4 rounded border-border"
                checked={draft.is_published}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    is_published: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="pub">{t("announcementPublished")}</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void save()} disabled={busy}>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium">
              {locale === "en" ? "Preview" : "プレビュー"}
            </h2>
            <div className="rounded-lg border border-border bg-background/70 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <PreviewIcon className={`mt-0.5 h-5 w-5 ${selectedIconType?.color ?? ""}`} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-tight">
                      {(draft.title_ja || "").trim() || "（タイトル未入力）"}
                    </p>
                    {draft.priority > 0 ? (
                      <Badge
                        variant={draft.priority === 2 ? "destructive" : "default"}
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        {draft.priority === 2 ? "緊急" : "高"}
                      </Badge>
                    ) : null}
                    <Badge variant={draft.is_published ? "default" : "secondary"}>
                      {draft.is_published
                        ? t("announcementPublishedBadge")
                        : t("announcementDraftBadge")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(draft.title_en || "").trim() || "No English title"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {(draft.content_ja || "").trim() || "（本文未入力）"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {(draft.content_en || "").trim() || "No English content"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="max-h-[min(60vh,520px)] overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("announcementColTitle")}</TableHead>
              <TableHead>{t("tableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  {t("announcementEmpty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {(() => {
                          const rowIconType = iconTypeMap.get(
                            r.icon_type as AnnouncementIconType,
                          );
                          const RowIcon = rowIconType?.icon ?? Megaphone;
                          return (
                            <RowIcon
                              className={`h-4 w-4 ${rowIconType?.color ?? "text-blue-600 dark:text-blue-400"}`}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title_ja || "—"}</span>
                          {r.priority > 0 && (
                            <Badge 
                              variant={r.priority === 2 ? "destructive" : "default"}
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {r.priority === 2 ? "緊急" : "高"}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {r.title_en || "—"}
                        </span>
                        <div className="flex gap-1">
                          {r.is_published ? (
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
                        onClick={() => openEdit(r)}
                        disabled={busy}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        aria-label={t("announcementDelete")}
                        onClick={() => void remove(r.id)}
                        disabled={busy || deletingAnnouncementId === r.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
