/**
 * Shell page for creating a new split group; delegates to `CreateGroupForm` (hybrid invite UX).
 * 新しい割り勘グループ作成ページ。`CreateGroupForm` に委譲（招待即表示のハイブリッド UX）。
 */

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
  const t = await getTranslations("GroupNew");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-[44px] md:min-h-0")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("backDashboard")}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("pageTitle")}</CardTitle>
            <CardDescription>{t("pageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
