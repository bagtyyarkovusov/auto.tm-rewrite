import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Touch feedback, kept rare and light: a tick when a tab is chosen, when the
 * tab-bar lens crosses into another slot, or when a Sign-in Method is
 * chosen. Android uses its system haptic constants
 * (`View.performHapticFeedback`), which match the platform's own controls
 * and do not themselves use the vibrator permission. The `expo-haptics`
 * package still declares `android.permission.VIBRATE` in its manifest, so
 * the built Android app carries that permission.
 * A device without haptics, or with them turned off, simply feels nothing.
 */
function run(feedback: () => Promise<void>) {
  feedback().catch(() => {});
}

/** A selection changed: a tab chosen, the tab-bar lens crossing into another tab, or a Sign-in Method tab chosen. */
export function selectionTick() {
  run(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
      : Haptics.selectionAsync(),
  );
}
