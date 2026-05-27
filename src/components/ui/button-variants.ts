/**
 * Link-as-button 用の HeroUI スタイル（サーバーコンポーネントから import 可）。
 */
import { buttonVariants as herouiButtonVariants } from "@heroui/styles";
import { cn } from "@/lib/utils";
import {
  isIconOnlyButtonSize,
  mapButtonSize,
  mapButtonVariant,
  type ShadcnButtonSize,
  type ShadcnButtonVariant,
} from "@/lib/ui/heroui-maps";

type ButtonVariantsOptions = {
  variant?: ShadcnButtonVariant | null;
  size?: ShadcnButtonSize | null;
  className?: string;
};

export function buttonVariants(options: ButtonVariantsOptions = {}) {
  const variant = options.variant ?? "default";
  const size = options.size ?? "default";

  return cn(
    herouiButtonVariants({
      variant: mapButtonVariant(variant),
      size: mapButtonSize(size),
      isIconOnly: isIconOnlyButtonSize(size),
    }),
    "inline-flex items-center justify-center no-underline",
    variant === "link" && "h-auto min-h-0 px-0 underline-offset-4 hover:underline",
    options.className,
  );
}

export type ButtonVariantsProps = ButtonVariantsOptions;
