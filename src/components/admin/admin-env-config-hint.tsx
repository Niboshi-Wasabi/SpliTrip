import { getTranslations } from "next-intl/server";
import {
  Card,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

type Props = {
  /** `getSupabaseEnv() !== null`（URL / anon が有効） */
  hasPublicSupabaseEnv: boolean;
  hasServiceRoleKey: boolean;
};

/**
 * 管理画面の Auth Admin / Service Role 系 API を使うページ向け。
 * 未設定の環境変数を列挙して表示する。
 */
export async function AdminEnvConfigHint({
  hasPublicSupabaseEnv,
  hasServiceRoleKey,
}: Props) {
  const t = await getTranslations("Admin");
  const needsPublic = !hasPublicSupabaseEnv;
  const needsService = !hasServiceRoleKey;

  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-destructive">
          {t("configErrorIntro")}
        </CardDescription>
        {needsPublic ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("configErrorPublic")}
          </p>
        ) : null}
        {needsService ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("configErrorService")}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
