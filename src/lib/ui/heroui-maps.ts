/** shadcn 互換 API → HeroUI variant / size のマッピング */

export type ShadcnButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";

export type ShadcnButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

export function mapButtonVariant(
  variant: ShadcnButtonVariant | null | undefined,
): "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-soft" | "tertiary" {
  switch (variant) {
    case "outline":
      return "outline";
    case "secondary":
      return "secondary";
    case "ghost":
      return "ghost";
    case "destructive":
      return "danger-soft";
    case "link":
      return "ghost";
    case "default":
    default:
      return "primary";
  }
}

export function mapButtonSize(
  size: ShadcnButtonSize | null | undefined,
): "sm" | "md" | "lg" {
  switch (size) {
    case "xs":
    case "sm":
    case "icon-xs":
    case "icon-sm":
      return "sm";
    case "lg":
    case "icon-lg":
      return "lg";
    case "icon":
    case "default":
    default:
      return "md";
  }
}

export function isIconOnlyButtonSize(
  size: ShadcnButtonSize | null | undefined,
): boolean {
  return (
    size === "icon" ||
    size === "icon-xs" ||
    size === "icon-sm" ||
    size === "icon-lg"
  );
}

export type ShadcnBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export function mapBadgeProps(variant: ShadcnBadgeVariant | null | undefined): {
  variant: "primary" | "secondary" | "soft";
  color?: "default" | "danger" | "accent" | "success" | "warning";
} {
  switch (variant) {
    case "destructive":
      return { variant: "soft", color: "danger" };
    case "secondary":
      return { variant: "soft", color: "default" };
    case "outline":
      return { variant: "secondary", color: "default" };
    case "ghost":
    case "link":
      return { variant: "soft", color: "default" };
    case "default":
    default:
      return { variant: "primary", color: "default" };
  }
}
