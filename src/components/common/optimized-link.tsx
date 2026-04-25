"use client";

import { useEffect } from "react";
import { Link as NextIntlLink, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  preloadOnHover?: boolean;
  [key: string]: any;
}

/**
 * 最適化されたリンクコンポーネント
 * - 自動プリフェッチ
 * - ホバー時のプリロード
 * - スムーズトランジション
 */
export function OptimizedLink({ 
  href, 
  children, 
  className, 
  prefetch = true, 
  preloadOnHover = true,
  ...props 
}: OptimizedLinkProps) {
  const router = useRouter();

  const handleMouseEnter = () => {
    if (preloadOnHover) {
      router.prefetch(href);
    }
  };

  return (
    <NextIntlLink
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      className={cn("transition-all duration-200 hover:scale-[1.02]", className)}
      {...props}
    >
      {children}
    </NextIntlLink>
  );
}