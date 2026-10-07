import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { cssInterop, useColorScheme } from "nativewind";
import type { RefObject } from "react";
import { View, type ViewProps } from "react-native";

import { useReduceTransparency } from "@/lib/motion";
import { cn } from "@/lib/utils";

cssInterop(GlassView, { className: "style" });
cssInterop(GlassContainer, { className: "style" });
cssInterop(BlurView, { className: "style" });

/** How strongly Android blurs what is behind a surface given a blur target. */
const ANDROID_BLUR_INTENSITY = 60;

/**
 * Liquid Glass ships with iOS 26. Checked once: it cannot change while the
 * app runs. The second check guards the early iOS 26 betas, which report the
 * design as available but crash when the glass effect is created
 * (expo/expo#40911).
 */
const LIQUID_GLASS = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * How close two glass shapes in one `GlassGroup` come before the system
 * blends them into one. Smaller than the 8 dp gap between two header circles,
 * so at rest they stay two circles and only a circle swelling under a finger
 * reaches toward its neighbour.
 */
const GLASS_GROUP_SPACING = 4;

/**
 * True where the system Liquid Glass is drawn: iOS 26 and later, with Reduce
 * Transparency off. An interactive system glass answers a touch itself, so a
 * control on it drops its own press scale instead of moving twice.
 */
function useSystemGlass() {
  const reduceTransparency = useReduceTransparency();
  return LIQUID_GLASS && !reduceTransparency;
}

type GlassSurfaceProps = ViewProps & {
  className?: string;
  /**
   * Classes for the material itself, when the fallback tone must differ from
   * the default (for example a darker glass on the black photo viewer).
   */
  materialClassName?: string;
  /** Lets the system glass react to touch. Use on a surface that is itself a control. */
  interactive?: boolean;
  /**
   * Android only: the view to blur behind the surface (see
   * `TabBlurTargets`). Without it Android draws the tuned surface.
   */
  blurTarget?: RefObject<View | null>;
};

/**
 * The one translucent material in the app. It belongs on floating navigation
 * and on controls that sit above scrolling content (the tab bar, sticky action
 * bars, floating chips, controls on a photo), never on content.
 *
 * Three renderings, each meant to look intended:
 *  - iOS 26 and later: the system Liquid Glass (`expo-glass-effect`), with
 *    a tone inside it so a label stays readable over whatever scrolls below.
 *  - Android 12 and later, when given a `blurTarget`: a real blur of what is
 *    behind it under the same tone as the system glass.
 *  - Otherwise on Android and iOS below 26: a tuned, nearly opaque surface
 *    with a light edge and the floating shadow. There is no blur pass, so it
 *    costs nothing and text on it never depends on what scrolls below.
 *  - Reduce Transparency: the fully opaque raised surface.
 *
 * `className` takes the layout, size and radius. The radius must be given
 * here, because the material is clipped to it.
 *
 * Two rules from the system glass: never fade a glass surface or one of its
 * parents with opacity (the material stops drawing), and keep `interactive`
 * fixed for the life of the surface.
 */
function GlassSurface({
  className,
  materialClassName,
  interactive = false,
  blurTarget,
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

  if (blurTarget && !reduceTransparency) {
    return (
      <BlurView
        blurTarget={blurTarget}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={ANDROID_BLUR_INTENSITY}
        tint={colorScheme === "dark" ? "dark" : "light"}
        className={cn(
          "overflow-hidden border-hairline border-glass-edge/70 dark:border-glass-edge/10",
          className,
        )}
        {...props}
      >
        <View pointerEvents="none" className="absolute inset-0 bg-glass/glass-tint" />
        {children}
      </BlurView>
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

type GlassGroupProps = ViewProps & { className?: string };

/**
 * Holds glass surfaces that sit close together, such as two header circles.
 * On iOS 26 the system draws them as one glass layer, so neither samples the
 * other's material and a circle swelling under a finger flows toward its
 * neighbour. Elsewhere it is a plain container with the same layout.
 */
function GlassGroup(props: GlassGroupProps) {
  const systemGlass = useSystemGlass();
  return systemGlass ? (
    <GlassContainer spacing={GLASS_GROUP_SPACING} {...props} />
  ) : (
    <View {...props} />
  );
}

export { GlassGroup, GlassSurface, useSystemGlass };
export type { GlassGroupProps, GlassSurfaceProps };
