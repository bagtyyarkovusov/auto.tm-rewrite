import { BlurTargetView } from "expo-blur";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Platform, type View } from "react-native";
import { cssInterop } from "nativewind";

cssInterop(BlurTargetView, { className: "style" });

/** The bar samples its focused screen, outside the screen's own blur target. */
const ANDROID_BLUR = Platform.OS === "android" && Number(Platform.Version) >= 31;
type Target = RefObject<View | null>;
type Registry = {
  targets: ReadonlyMap<string, Target>;
  register: (key: string, target: Target) => () => void;
};
const TabBlurContext = createContext<Registry | null>(null);

function TabBlurTargets({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<ReadonlyMap<string, Target>>(new Map());
  const register = useCallback((key: string, target: Target) => {
    setTargets((current) => new Map(current).set(key, target));
    return () => setTargets((current) => {
      if (current.get(key) !== target) return current;
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ targets, register }), [targets, register]);
  return <TabBlurContext.Provider value={registry}>{children}</TabBlurContext.Provider>;
}

function TabBlurTarget({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const register = useContext(TabBlurContext)?.register;
  const ref = useRef<View | null>(null);
  // Notify the bar only after the native ref has mounted; retire refs with their screens.
  useLayoutEffect(() => {
    if (ANDROID_BLUR && register) return register(routeKey, ref);
  }, [register, routeKey]);
  if (!ANDROID_BLUR || !register) return <>{children}</>;
  return <BlurTargetView ref={ref} className="flex-1">{children}</BlurTargetView>;
}

/** Undefined on platforms that keep the existing material fallback. */
function useTabBlurTarget(routeKey: string | undefined) {
  const registry = useContext(TabBlurContext);
  if (!ANDROID_BLUR || !routeKey) return undefined;
  return registry?.targets.get(routeKey);
}

export { ANDROID_BLUR, TabBlurTarget, TabBlurTargets, useTabBlurTarget };
