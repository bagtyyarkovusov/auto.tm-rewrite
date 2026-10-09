# Carberk brand

Carberk is the public name of the product ([ADR-0093](../../../adr/0093-carberk-is-the-public-product-name.md)). Its parent company is Alpha Motors.

## Logo

The logo is the wordmark **carberk.** in lowercase, set in Poppins ExtraBold with a round dot after the name. The app icon is the first letter and the dot: **c.**

| File | Use |
|---|---|
| `carberk-wordmark.svg` | Dark letters, red dot. Light backgrounds. |
| `carberk-wordmark-white.svg` | All white. Red or dark backgrounds. |
| `carberk-wordmark-red.svg` | All red. The in-app header, which must work in light and dark themes. |
| `carberk-mark.svg` | The "c." mark in red. |
| `social/instagram-avatar-1080.png` | Profile picture. The mark stays inside the round crop. |

The app's own copies are `apps/mobile/assets/logo-carberk-red.svg` and the icon and launch images in `apps/mobile/assets/images/`. The Play store icon and feature graphics are in [the submission pack](../play-console-submission/README.md).

## Rules

- Keep the dot. A plain "c" on a coloured square is not distinctive; the dot and the red are.
- The dot is the only second colour. On a red background the whole logo is white.
- Do not add a car, tick, shield or any other picture to the logo.
- Write "Carberk" in sentences and under the app icon. Only the logo is lowercase.
- Do not use a registered-mark symbol. The name is not registered.
- Do not print `carberk.tm` or any other new address until the domain is owned and live.

## Colours and type

| | Value |
|---|---|
| Brand red | `#E60000` |
| Ink | `#17191D` |
| Warm white | `#FAF9F7` |
| Logo typeface | Poppins ExtraBold, tracking −3.5% |
| App and supporting text | Geist |

## Alpha Motors

Use "by Alpha Motors" as a small line under or below the logo: the About screen, the web home page, the store description and the feature graphic. It does not go in the app icon or the app title.

Turkmen text uses the parent company's line: **Alpha Motors bilen arzan däl-de, amatly ulag satyn al.** There is no approved Russian or English version of that line, so those languages use "от Alpha Motors" and "by Alpha Motors".

## Claims

Carberk is a marketplace. Do not use "verified", "inspected", "checked" or "clean history" in brand material unless the product does that for the item shown.

## Regenerating the files

`tools/generate-assets.py` draws every file above from the font's outlines. The font file is not committed; its licence is in `tools/Poppins-OFL.txt`.
