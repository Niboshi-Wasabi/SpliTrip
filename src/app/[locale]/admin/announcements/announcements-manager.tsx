"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
import { Pencil, Plus, Trash2, Star, Bug, Megaphone, Palette, Shield, Wrench } from "lucide-react";
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
  { value: 'announcement', label: 'お知らせ', icon: Megaphone, color: 'text-blue-600' },
  { value: 'feature', label: '新機能', icon: Star, color: 'text-green-600' },
  { value: 'bugfix', label: 'バグ修正', icon: Bug, color: 'text-orange-600' },
  { value: 'design', label: 'デザイン', icon: Palette, color: 'text-purple-600' },
  { value: 'security', label: 'セキュリティ', icon: Shield, color: 'text-red-600' },
  { value: 'maintenance', label: 'メンテナンス', icon: Wrench, color: 'text-gray-600' },
];

export function AnnouncementsManager() {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [draft, setDraft] = useState({
    title_ja: "",
    title_en: "",
    content_ja: "",
    content_en: "",
    icon_type: "announcement",
    priority: 0,
    is_published: false,
  });

  const getIconComponent = (iconType: string) => {
    const iconConfig = ICON_TYPES.find(type => type.value === iconType);
    return iconConfig ? iconConfig.icon : Megaphone;
  };

  const getIconColor = (iconType: string) => {
    const iconConfig = ICON_TYPES.find(type => type.value === iconType);
    return iconConfig ? iconConfig.color : 'text-blue-600';
  };

  const load = useCallback(async () => {
    setLoadError(null);
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
    setEditing("new");
    setDraft({
      title_ja: "",
      title_en: "",
      content_ja: "",
      content_en: "",
      icon_type: "announcement",
      priority: 0,
      is_published: false,
    });
  }

  function openEdit(row: Row) {
    setEditing(row);
    setDraft({
      title_ja: row.title_ja,
      title_en: row.title_en,
      content_ja: row.content_ja ?? "",
      content_en: row.content_en ?? "",
      icon_type: row.icon_type ?? "announcement",
      priority: row.priority ?? 0,
      is_published: row.is_published,
    });
  }

  async function save() {
    setBusy(true);
    try {
      if (editing === "new") {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (res.ok) {
          setEditing(null);
          void load();
          router.refresh();
        }
        return;
      }
      if (editing && typeof editing === "object") {
        const res = await fetch(`/api/admin/announcements/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (res.ok) {
          setEditing(null);
          void load();
          router.refresh();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("announcementDeleteConfirm"))) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        void load();
        router.refresh();
      }
    } finally {
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
      <div className="flex justify-end">
        <Button type="button" onClick={openNew} className="gap-1.5" disabled={busy}>
          <Plus className="h-4 w-4" />
          {t("announcementNew")}
        </Button>
      </div>
      {editing ? (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium">
            {editing === "new" ? t("announcementNew") : t("announcementEdit")}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="tja">{t("announcementTitleJa")}</Label>
              <Input
                id="tja"
                value={draft.title_ja}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title_ja: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="ten">{t("announcementTitleEn")}</Label>
              <Input
                id="ten"
                value={draft.title_en}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title_en: e.target.value }))
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, content_ja: e.target.value }))
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, content_en: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="iconType">アイコンタイプ</Label>
              <select
                id="iconType"
                value={draft.icon_type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, icon_type: e.target.value }))
                }
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {ICON_TYPES.map((iconType) => (
                  <option key={iconType.value} value={iconType.value}>
                    {iconType.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="priority">優先度</Label>
              <select
                id="priority"
                value={draft.priority}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, priority: parseInt(e.target.value) }))
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, is_published: e.target.checked }))
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
                          const IconComponent = getIconComponent(r.icon_type);
                          return (
                            <IconComponent 
                              className={`h-4 w-4 ${getIconColor(r.icon_type)}`} 
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
                        disabled={busy}
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
