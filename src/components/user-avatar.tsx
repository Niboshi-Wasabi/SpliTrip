/**
 * Renders a user avatar: OAuth profile image or first-character fallback.
 * Google/LINE のプロフィール画像があれば表示し、なければ表示名の頭文字を表示する。
 */

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

const PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let charIndex = 0; charIndex < name.length; charIndex++) {
    hash = (hash * 31 + name.charCodeAt(charIndex)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

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

  if (avatarUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClass} shrink-0 rounded-full object-cover ${className}`}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initial = firstGrapheme(displayName.trim());
  const colorClass = hashColor(displayName);

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${colorClass} ${className}`}
      aria-label={displayName}
    >
      {initial}
    </span>
  );
}
