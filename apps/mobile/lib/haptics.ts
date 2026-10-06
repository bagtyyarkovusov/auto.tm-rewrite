import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Touch feedback, kept rare and light: a tick when a selection changes, a
 * soft tap when a toggle flips. Android uses its system haptic constants,
 * which need no vibrate permission and match the platform's own controls.
 * A device without haptics, or with them turned off, simply feels nothing.
 */
function run(feedback: () => Promise<void>) {
  feedback().catch(() => {});
}

/** A selection changed: a tab chosen, or the tab-bar lens crossing into another tab. */
export function selectionTick() {
  run(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
      : Haptics.selectionAsync(),
  );
}

/** A toggle flipped, such as the favourite heart. */
export function toggleTap() {
  run(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
}
