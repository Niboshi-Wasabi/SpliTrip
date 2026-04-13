/**
 * Renders a user avatar: OAuth profile image or first-character fallback.
 * Google/LINE のプロフィール画像があれば表示し、なければ表示名の頭文字を表示する。
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { stringToColor } from "@/lib/string-to-color";

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

function firstGrapheme(text: string): string {
  const segmenter = typeof Intl?.Segmenter === "function"
    ? new Intl.Segmenter("ja", { granularity: "grapheme" })
    : null;
  if (segmenter) {
    const segments = segmenter.segment(text);
    const first = segments[Symbol.iterator]().next();
    return first.done ? "?" : first.value.segment;
  }
  return text.charAt(0) || "?";
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size = "md",
  className = "",
}: Props) {
  const sizeClass = SIZE_CLASSES[size];
  const initial = firstGrapheme(displayName.trim());
  const { background, foreground } = stringToColor(displayName);

  return (
    <Avatar
      className={`${sizeClass} shrink-0 ${className}`}
      aria-label={displayName}
    >
      <AvatarImage
        src={avatarUrl ?? undefined}
        alt={displayName}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      <AvatarFallback
        className="font-medium"
        style={{ backgroundColor: background, color: foreground }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
