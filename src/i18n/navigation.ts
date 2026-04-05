/**
 * Locale-aware navigation wrappers (Link, redirect, useRouter, …).
 * ロケールを考慮した Link / redirect / useRouter など。
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
