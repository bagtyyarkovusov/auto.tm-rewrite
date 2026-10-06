import { BlurTargetView } from "expo-blur";
import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import { Platform, type View } from "react-native";

/**
 * Android draws a real blur only from a view it is told to sample, and the
 * blurring view must sit outside it. Each tab screen is wrapped in its own
 * target here, and the floating tab bar blurs whichever one is open. iOS
 * needs none of this: its system glass samples what is behind it.
 */
const ANDROID_BLUR = Platform.OS === "android" && Number(Platform.Version) >= 31;

type Targets = Map<string, RefObject<View | null>>;

const TabBlurContext = createContext<Targets | null>(null);

function TabBlurTargets({ children }: { children: ReactNode }) {
  const targets = useRef<Targets>(new Map()).current;
  return <TabBlurContext.Provider value={targets}>{children}</TabBlurContext.Provider>;
}

function TabBlurTarget({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const targets = useContext(TabBlurContext);
  const ref = useRef<View | null>(null);
  if (!ANDROID_BLUR || !targets) return <>{children}</>;
  targets.set(routeKey, ref);
  return (
    <BlurTargetView ref={ref} style={{ flex: 1 }}>
      {children}
    </BlurTargetView>
  );
}

/** The open tab's screen, for the bar to blur; undefined where no blur is drawn. */
function useTabBlurTarget(routeKey: string | undefined) {
  const targets = useContext(TabBlurContext);
  if (!ANDROID_BLUR || !targets || !routeKey) return undefined;
  return targets.get(routeKey);
}

export { ANDROID_BLUR, TabBlurTarget, TabBlurTargets, useTabBlurTarget };
