"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Shield, Loader2, CheckCircle, AlertCircle, Repeat } from "lucide-react";
import type { AdminUserListItem } from "@/lib/admin/list-admin-users";

type UsersTableProps = {
  users: AdminUserListItem[];
};

export function UsersTable({ users }: UsersTableProps) {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  const router = useRouter();
  const t = useTranslations("Admin");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAccountBadge = (user: AdminUserListItem) => {
    if (user.is_admin) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="h-3 w-3" />
          {t("accountAdmin")}
        </Badge>
      );
    }
    if (user.premium_access) {
      return (
        <Badge variant="default" className="gap-1">
          <Crown className="h-3 w-3" />
          {t("accountPro")}
        </Badge>
      );
    }
    return <Badge variant="outline">{t("accountFree")}</Badge>;
  };

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case "stripe":
        return <Badge variant="secondary">{t("sourceStripe")}</Badge>;
      case "manual":
        return <Badge variant="outline">{t("sourceManual")}</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{t("sourceNone")}</Badge>;
    }
  };

  const handleGrantPro = async (userId: string) => {
    if (loadingActions.has(userId)) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.premium_access) {
      alert("このユーザーは既にPRO権限を持っています。");
      return;
    }

    setLoadingActions(prev => new Set(prev).add(userId));

    try {
      const response = await fetch(`/api/admin/users/${userId}/grant-pro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.alreadyPro) {
        alert(t("alreadyPro"));
      } else {
        alert(t("grantSuccess"));
      }

      // 画面を更新
      router.refresh();
    } catch (error) {
      console.error("[grantPro] エラー:", error);
      let errorMessage = t("grantError");
      
      if (error instanceof Error) {
        if (error.message.includes("403")) {
          errorMessage = t("forbidden");
        } else if (error.message.includes("500")) {
          errorMessage = t("serverError");
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoadingActions(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleRevokePro = async (userId: string) => {
    if (loadingActions.has(userId)) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!user.premium_access) {
      alert("このユーザーは既に無料ユーザーです。");
      return;
    }

    const confirmMessage = t("revokeConfirm", { name: user.display_name || user.email || "ユーザー" });
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoadingActions(prev => new Set(prev).add(userId));

    try {
      const response = await fetch(`/api/admin/users/${userId}/revoke-pro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.alreadyFree) {
        alert("このユーザーは既に無料ユーザーです。");
      } else {
        alert(t("revokeSuccess"));
      }

      // 画面を更新
      router.refresh();
    } catch (error) {
      console.error("[revokePro] エラー:", error);
      let errorMessage = t("revokeError");
      
      if (error instanceof Error) {
        if (error.message.includes("403")) {
          errorMessage = t("forbidden");
        } else if (error.message.includes("500")) {
          errorMessage = t("serverError");
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoadingActions(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleSyncStripe = async (userId: string) => {
    if (loadingActions.has(userId)) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    setLoadingActions(prev => new Set(prev).add(userId));

    try {
      const response = await fetch(`/api/admin/users/${userId}/sync-stripe`, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404 || data.message === "no_stripe_customer") {
          alert("このユーザーはStripeの顧客情報が見つかりません。");
        } else {
          throw new Error(data.error || `HTTP ${response.status}`);
        }
        return;
      }

      if (data.skipped) {
        alert(t("syncStripeSkippedManual"));
      } else {
        alert(t("syncStripeSuccess"));
      }

      // 画面を更新
      router.refresh();
    } catch (error) {
      console.error("[syncStripe] エラー:", error);
      let errorMessage = t("syncStripeError");
      
      if (error instanceof Error) {
        if (error.message.includes("403")) {
          errorMessage = t("forbidden");
        } else if (error.message.includes("500")) {
          errorMessage = t("serverError");
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoadingActions(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        登録ユーザーが見つかりません。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableUser")}</TableHead>
              <TableHead>{t("tableAccount")}</TableHead>
              <TableHead>{t("tableRegistered")}</TableHead>
              <TableHead>{t("tableLastSignIn")}</TableHead>
              <TableHead className="text-center">{t("tableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isLoading = loadingActions.has(user.id);
              
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {(user.display_name || user.email || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.display_name || "未設定"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email || "メール未設定"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getAccountBadge(user)}
                      {user.premium_access && (
                        <div>{getSourceBadge(user.premium_access_source)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(user.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : "未ログイン"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1 flex-wrap">
                      {user.is_admin ? (
                        <Badge variant="outline" className="text-xs">
                          管理者
                        </Badge>
                      ) : (
                        <>
                          <div className="flex gap-1">
                            {!user.premium_access ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleGrantPro(user.id)}
                                disabled={isLoading}
                                className="text-xs h-7 px-2"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                <span className="ml-1 hidden sm:inline">
                                  {isLoading ? t("granting") : t("grantPro")}
                                </span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRevokePro(user.id)}
                                disabled={isLoading}
                                className="text-xs h-7 px-2"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                <span className="ml-1 hidden sm:inline">
                                  {isLoading ? t("revoking") : t("revokePro")}
                                </span>
                              </Button>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncStripe(user.id)}
                            disabled={isLoading}
                            className="text-xs h-7 px-2"
                            title="Stripeと同期"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Repeat className="h-3 w-3" />
                            )}
                            <span className="ml-1 hidden lg:inline">
                              {isLoading ? t("syncStripeWorking") : t("syncStripe")}
                            </span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        合計 {users.length} 人のユーザーが登録されています
      </div>
    </div>
  );
}