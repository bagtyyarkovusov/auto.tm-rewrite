import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { cssInterop, useColorScheme } from "nativewind";
import { View, type ViewProps } from "react-native";

import { useReduceTransparency } from "@/lib/motion";
import { cn } from "@/lib/utils";

cssInterop(GlassView, { className: "style" });

/** Liquid Glass ships with iOS 26. Checked once: it cannot change while the app runs. */
const LIQUID_GLASS = isLiquidGlassAvailable();

type GlassSurfaceProps = ViewProps & {
  className?: string;
  /**
   * Classes for the material itself, when the fallback tone must differ from
   * the default (for example a darker glass on the black photo viewer).
   */
  materialClassName?: string;
  /** Lets the system glass react to touch. Use on a surface that is itself a control. */
  interactive?: boolean;
};

/**
 * The one translucent material in the app. It belongs on floating navigation
 * and on controls that sit above scrolling content (the tab bar, sticky action
 * bars, floating chips, controls on a photo), never on content.
 *
 * Three renderings, each meant to look intended:
 *  - iOS 26 and later: the system Liquid Glass (`expo-glass-effect`), with
 *    a tone inside it so a label stays readable over whatever scrolls below.
 *  - Android and iOS below 26: a tuned, nearly opaque surface with a light
 *    edge and the floating shadow. There is no blur pass, so it costs nothing
 *    on a mid-range phone and text on it never depends on what scrolls below.
 *  - Reduce Transparency: the fully opaque raised surface.
 *
 * `className` takes the layout, size and radius. The radius must be given
 * here, because the material is clipped to it.
 */
function GlassSurface({
  className,
  materialClassName,
  interactive = false,
  children,
  ...props
}: GlassSurfaceProps) {
  const reduceTransparency = useReduceTransparency();
  const { colorScheme } = useColorScheme();

  if (LIQUID_GLASS && !reduceTransparency) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={colorScheme === "dark" ? "dark" : "light"}
        isInteractive={interactive}
        className={cn("overflow-hidden", className)}
        {...props}
      >
        <View pointerEvents="none" className="absolute inset-0 bg-glass/glass-tint" />
        {children}
      </GlassView>
    );
  }

  return (
    <View
      className={cn(
        "border-hairline shadow-floating",
        reduceTransparency
          ? "border-border bg-card"
          : "border-glass-edge/70 bg-glass/glass dark:border-glass-edge/10",
        materialClassName,
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export { GlassSurface };
export type { GlassSurfaceProps };
