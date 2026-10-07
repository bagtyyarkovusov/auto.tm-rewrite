import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Touch feedback, kept rare and light: a tick when a tab is chosen or the
 * tab-bar lens crosses into another slot. Android uses its system haptic
 * constants (`View.performHapticFeedback`), which match the platform's own
 * controls and do not themselves use the vibrator permission. The
 * `expo-haptics` package still declares `android.permission.VIBRATE` in its
 * manifest, so the built Android app carries that permission.
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
