import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { BlurView } from "expo-blur";
import { mobileSurfaces } from "@auto-tm/ui/tokens";
import { cssInterop, useColorScheme } from "nativewind";
import { createContext, useContext, type RefObject } from "react";
import { Platform, View, type ViewProps } from "react-native";

import { useReduceTransparency } from "@/lib/motion";
import { cn } from "@/lib/utils";

cssInterop(GlassView, { className: "style" });
cssInterop(GlassContainer, { className: "style" });
cssInterop(BlurView, { className: "style" });

/**
 * How the blur behind a surface is drawn, with each platform's thinnest
 * system material: it frosts what is behind it and adds little tone of its
 * own, so the glass tone decides the contrast on both platforms.
 *
 * Android derives both the blur radius and the material's tone from
 * `intensity`. A low intensity keeps that tone light, and
 * `blurReductionFactor` 1 keeps the radius at 20, which frosts a photo.
 * Android below 12 draws no blur (`dimezisBlurViewSdk31Plus`).
 */
const ANDROID_BLUR = { intensity: 20, blurReductionFactor: 1, blurMethod: "dimezisBlurViewSdk31Plus" } as const;
const IOS_BLUR = { intensity: 70 } as const;

/** The light that falls on the top of a glass surface: the glass edge colour, fading out by the middle. */
function sheen(alpha: number): string {
  const [hue, saturation, lightness] = mobileSurfaces.glassEdge.light.split(" ");
  const tone = (a: number) => `hsla(${hue}, ${saturation}, ${lightness}, ${a})`;
  return `linear-gradient(to bottom, ${tone(alpha)} 0%, ${tone(0)} 55%)`;
}
const SHEEN = { light: sheen(0.5), dark: sheen(0.1) } as const;

/**
 * Android only: the view a glass surface blurs when it is given no
 * `blurTarget` of its own. Provide it only around surfaces drawn outside that
 * view: a blur inside its own target cannot be drawn.
 */
const GlassBackdrop = createContext<RefObject<View | null> | undefined>(undefined);

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
   * Classes for the material's tone, when it must differ from the default
   * (for example a darker glass on the black photo viewer).
   */
  materialClassName?: string;
  /** Lets the system glass react to touch. Use on a surface that is itself a control. */
  interactive?: boolean;
  /**
   * Android only: the view to blur behind the surface (see `TabBlurTargets`
   * and `GlassBackdrop`). Without one Android draws the tuned surface.
   */
  blurTarget?: RefObject<View | null>;
};

/**
 * The one translucent material in the app. It belongs on floating navigation
 * and on controls that sit above scrolling content (the tab bar, sticky action
 * bars, floating chips, controls on a photo), never on content. Every surface
 * is the same glass: one blur, tone, light rim, sheen and shadow.
 *
 * Its renderings, each meant to look intended:
 *  - iOS 26 and later: the system Liquid Glass (`expo-glass-effect`), with
 *    a tone inside it so a label stays readable over whatever scrolls below.
 *  - iOS below 26, and Android 12 and later when there is a blur target: a
 *    real blur of what is behind it (`expo-blur`) under the `frosted` tone.
 *  - Otherwise on Android: the same rim, sheen and shadow over a nearly
 *    opaque tone. There is no blur pass, so it costs nothing and text on it
 *    never depends on what scrolls below.
 *  - Reduce Transparency: the fully opaque raised surface.
 *
 * `className` takes the layout, size and radius. The radius must be given
 * here as `rounded-*` classes, because the material is clipped to it.
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
  const backdrop = useContext(GlassBackdrop);
  const dark = colorScheme === "dark";

  if (LIQUID_GLASS && !reduceTransparency) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={dark ? "dark" : "light"}
        isInteractive={interactive}
        className={cn("overflow-hidden", className)}
        {...props}
      >
        <View pointerEvents="none" className="absolute inset-0 bg-glass/glass-tint" />
        {children}
      </GlassView>
    );
  }

  const target = blurTarget ?? backdrop;
  // iOS blurs whatever is behind the view; Android needs a target to sample.
  const blurred =
    !reduceTransparency && (Platform.OS === "ios" || (Platform.OS === "android" && !!target));
  // The material is its own layer, clipped to the surface's radius, so the
  // surface itself is never clipped and keeps its shadow.
  const shape = className
    ?.split(/\s+/)
    .filter((name) => name.startsWith("rounded-"))
    .join(" ");

  return (
    <View className={cn("shadow-floating", className)} {...props}>
      <View pointerEvents="none" className={cn("absolute inset-0 overflow-hidden", shape)}>
        {blurred ? (
          <BlurView
            {...(Platform.OS === "android" ? ANDROID_BLUR : IOS_BLUR)}
            blurTarget={target}
            tint={dark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
            className={cn("absolute inset-0 overflow-hidden", shape)}
          />
        ) : null}
        <View
          className={cn(
            "absolute inset-0",
            reduceTransparency ? "bg-card" : blurred ? "bg-glass/glass-frosted" : "bg-glass/glass",
            materialClassName,
          )}
        />
        {reduceTransparency ? null : (
          <View
            className="absolute inset-0"
            style={{ experimental_backgroundImage: dark ? SHEEN.dark : SHEEN.light }}
          />
        )}
        <View
          className={cn(
            "absolute inset-0 border",
            shape,
            reduceTransparency
              ? "border-border"
              : "border-glass-edge/glass-rim dark:border-glass-edge/glass-rim-dark",
          )}
        />
      </View>
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

export { GlassBackdrop, GlassGroup, GlassSurface, useSystemGlass };
export type { GlassGroupProps, GlassSurfaceProps };
