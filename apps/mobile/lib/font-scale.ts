import * as React from "react";
import { useWindowDimensions } from "react-native";

/**
 * How far each type role grows with the system font size. The larger a role
 * already is, the less it grows, as iOS Dynamic Type and Android 14 do: an
 * uncapped 34 dp title at 2x fills the screen and pushes the content it names
 * off it. Reading text (body, callout, footnote, caption) has no cap.
 */
export const ROLE_MAX_FONT_SCALE = {
  display: 1.3,
  title: 1.4,
  headline: 1.5,
  subhead: 1.6,
  micro: 1.3,
} as const;

/**
 * A label inside a button or a chip stops here; past it the control wraps the
 * label onto a second line and grows instead.
 */
export const CONTROL_MAX_FONT_SCALE = 1.5;

/** A count or a caption drawn on a photo sits in a small pill. */
export const MEDIA_CHIP_MAX_FONT_SCALE = 1.3;

/**
 * A unit drawn inside a field at its trailing edge ("TMT"). The field reserves
 * a fixed width for it, so it must not outgrow that.
 */
export const FIELD_SUFFIX_MAX_FONT_SCALE = 1.3;

/** From this font scale a row of side-by-side controls stacks instead. */
export const LARGE_TEXT_FONT_SCALE = 1.3;

const ROLE_CLASS = /(?:^|\s)text-(display|title|headline|subhead|micro)(?=\s|$)/g;

/** The cap for the type role named in a class list, or none. */
export function maxFontScaleFor(className: string | undefined): number | undefined {
  if (!className) return undefined;
  let role: keyof typeof ROLE_MAX_FONT_SCALE | undefined;
  for (const match of className.matchAll(ROLE_CLASS)) {
    role = match[1] as keyof typeof ROLE_MAX_FONT_SCALE;
  }
  return role ? ROLE_MAX_FONT_SCALE[role] : undefined;
}

/** A cap handed down by a control (a button, a chip) to the labels inside it. */
export const TextScaleContext = React.createContext<number | undefined>(undefined);

/** True when the system font size is large enough that rows should stack. */
export function useLargeText(): boolean {
  return useWindowDimensions().fontScale >= LARGE_TEXT_FONT_SCALE;
}
