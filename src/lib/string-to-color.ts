/**
 * Deterministic pastel colors from a display name (same string → same colors).
 * 表示名から決定論的にアバター背景色を生成（同じ名前なら常に同じ色）。
 */

export type StringToColorResult = {
  /** CSS `background` value (typically `hsl(...)`) */
  background: string;
  /** Text color with sufficient contrast on `background` */
  foreground: string;
};

function hashStringToUint32(input: string): number {
  let hash = 5381;
  for (let index = 0; index < input.length; index++) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return hash >>> 0;
}

function hslToRgb(
  hue: number,
  saturationPercent: number,
  lightnessPercent: number,
): [number, number, number] {
  const h = ((hue % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, saturationPercent)) / 100;
  const lightness = Math.max(0, Math.min(100, lightnessPercent)) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (h < 60) {
    red = chroma;
    green = x;
  } else if (h < 120) {
    red = x;
    green = chroma;
  } else if (h < 180) {
    green = chroma;
    blue = x;
  } else if (h < 240) {
    green = x;
    blue = chroma;
  } else if (h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }
  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ];
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const redLinear = linearize(red);
  const greenLinear = linearize(green);
  const blueLinear = linearize(blue);
  return (
    0.2126 * redLinear + 0.7152 * greenLinear + 0.0722 * blueLinear
  );
}

function pickForegroundForHsl(
  hue: number,
  saturationPercent: number,
  lightnessPercent: number,
): string {
  const [red, green, blue] = hslToRgb(
    hue,
    saturationPercent,
    lightnessPercent,
  );
  const luminance = relativeLuminance(red, green, blue);
  return luminance > 0.55 ? "#0f172a" : "#f8fafc";
}

/**
 * Maps a display name to a pastel background and contrasting foreground (for initials).
 * The **trimmed** string seeds the hue (same logical name → same colors).
 * Empty or whitespace-only names fall back to a neutral slate palette.
 */
export function stringToColor(name: string): StringToColorResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return {
      background: "hsl(220, 14%, 92%)",
      foreground: "#334155",
    };
  }

  const hash = hashStringToUint32(trimmed);
  const hue = hash % 360;
  const saturation = 38 + ((hash >> 8) % 32);
  const lightness = 70 + ((hash >> 16) % 14);

  const background = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const foreground = pickForegroundForHsl(hue, saturation, lightness);

  return { background, foreground };
}
