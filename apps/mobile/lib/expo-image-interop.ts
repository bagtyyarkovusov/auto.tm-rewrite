import { Image } from "expo-image";
import { cssInterop } from "nativewind";

/**
 * Bridges `expo-image` into NativeWind so `className` reaches its `style` prop.
 *
 * Without this, NativeWind silently drops `className` on `expo-image`'s `Image`
 * (it only maps props for components it knows about). Every call site that sized
 * its image with utility classes therefore rendered at zero width and height —
 * visible as an empty placeholder box rather than a broken-image icon, which is
 * why it read as missing data instead of a bug. Affected surfaces included the
 * listing feed cards, owner and draft cards, and all four chat surfaces.
 *
 * NativeWind requires this registration to run once at the app entry point, so
 * it is imported from `app/_layout.tsx`. Passing `style` directly still works,
 * which is what the photo gallery and upload wizard already do.
 */
cssInterop(Image, {
  className: "style",
});
