/**
 * Picks the bundled font face for a set of text classes.
 *
 * React Native draws a custom font from exactly one file. A weight class on
 * top of `Geist-Regular` does not select the Bold file, so
 * `font-semibold` used to render at regular weight (and Android would smear a
 * fake bold over it). Each bundled face is its own family utility
 * (`font-sans-bold`, `font-heading-bold`, see `mobileFontFaces` in
 * packages/ui/tokens/mobile.ts). This function reads the family and weight
 * classes a call site already uses and returns the matching face utility, so
 * call sites keep writing `font-heading font-semibold`.
 *
 * The weight class is left in place: tests and tailwind-merge read it, and on
 * iOS it agrees with the face that is selected.
 */

type Family = "sans" | "heading" | "mono";
type Weight = "light" | "normal" | "medium" | "semibold" | "bold";

const FAMILY_CLASS: Record<string, Family> = {
  "font-sans": "sans",
  "font-heading": "heading",
  "font-mono": "mono",
};

const WEIGHT_CLASS: Record<string, Weight> = {
  "font-light": "light",
  "font-normal": "normal",
  "font-medium": "medium",
  "font-semibold": "semibold",
  "font-bold": "bold",
  "font-extrabold": "bold",
};

/** The bundled faces: Geist in five weights (headings start at Medium), Geist Mono in two. */
const FACE: Record<Family, Record<Weight, string>> = {
  sans: {
    light: "font-sans-light",
    normal: "font-sans",
    medium: "font-sans-medium",
    semibold: "font-sans-semibold",
    bold: "font-sans-bold",
  },
  heading: {
    light: "font-heading",
    normal: "font-heading",
    medium: "font-heading",
    semibold: "font-heading-semibold",
    bold: "font-heading-bold",
  },
  mono: {
    light: "font-mono",
    normal: "font-mono",
    medium: "font-mono-medium",
    semibold: "font-mono-medium",
    bold: "font-mono-medium",
  },
};

const FACE_CLASSES = new Set(
  Object.values(FACE).flatMap((weights) => Object.values(weights)),
);

/** Strips a variant prefix such as `dark:` or `disabled:`; those never change the face. */
function isPlain(token: string): boolean {
  return !token.includes(":");
}

/**
 * Returns the face utility for `className`, or `undefined` when the classes
 * already name an explicit face (`font-sans-bold`) or name neither a family
 * nor a weight.
 */
export function fontFaceClass(className: string | undefined): string | undefined {
  if (!className) return undefined;

  let family: Family | undefined;
  let weight: Weight | undefined;
  let explicitFace = false;

  for (const token of className.split(/\s+/)) {
    if (!token.startsWith("font-") || !isPlain(token)) continue;
    const nextFamily = FAMILY_CLASS[token];
    if (nextFamily) {
      family = nextFamily;
      explicitFace = false;
      continue;
    }
    const nextWeight = WEIGHT_CLASS[token];
    if (nextWeight) {
      weight = nextWeight;
      continue;
    }
    if (FACE_CLASSES.has(token)) explicitFace = true;
  }

  if (explicitFace) return undefined;
  if (!family && !weight) return undefined;
  return FACE[family ?? "sans"][weight ?? "normal"];
}

/** `className` with its face utility appended, ready for a native `Text` or `TextInput`. */
export function withFontFace(className: string): string {
  const face = fontFaceClass(className);
  return face ? `${className} ${face}` : className;
}

/**
 * Figures of equal width, for numbers that should line up like a catalogue:
 * prices, mileage, years, counts. Pass it as a `Text` style; NativeWind 4 has
 * no working utility for `font-variant-numeric`.
 *
 * Geist carries the `tnum` feature, so the figures line up on iOS and Android.
 */
export const tabularFigures: { fontVariant: "tabular-nums"[] } = {
  fontVariant: ["tabular-nums"],
};
