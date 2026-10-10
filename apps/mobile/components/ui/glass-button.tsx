import { GlassView } from "expo-glass-effect";
import { useColorScheme } from "nativewind";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSystemGlass } from "@/components/ui/glass-surface";
import { PressableScale, type PressableScaleProps } from "@/components/ui/pressable-scale";
import { TextClassContext } from "@/components/ui/text";
import { CONTROL_MAX_FONT_SCALE, TextScaleContext } from "@/lib/font-scale";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

type GlassButtonProps = Omit<PressableScaleProps, "children" | "feedback"> & {
  /** `brand` for the screen's primary action (Call, Show results); `neutral` for the rest. */
  tone?: "brand" | "neutral";
  /** Layout only (`flex-1`, margins). The capsule shape and size are fixed. */
  className?: string;
  children: ReactNode;
};

/**
 * A floating action that is its own material, for the buttons a
 * `StickyActionBar` pins over scrolling content. The bar draws nothing behind
 * them, so each button is the one surface: never a pill inside a pill.
 *
 *  - iOS 26 and later: an interactive Liquid Glass capsule. `brand` is tinted
 *    the brand red with a white label; `neutral` is clear glass with the
 *    foreground label. The system glass answers a touch itself, so there is no
 *    press scale. Disabled drops the tint and quiets the label.
 *  - Elsewhere, and with Reduce Transparency: a solid capsule with the floating
 *    shadow, brand red or the card tone, so it still lifts off the content.
 *
 * Both are 56 dp tall, the main-action height.
 */
function GlassButton({ tone = "neutral", className, disabled, children, ...props }: GlassButtonProps) {
  const systemGlass = useSystemGlass();
  const { colorScheme } = useColorScheme();

  if (!systemGlass) {
    return (
      <Button
        variant={tone === "brand" ? "brand" : "secondary"}
        size="lg"
        disabled={disabled}
        className={cn("rounded-full shadow-floating", tone === "neutral" && "bg-card active:bg-secondary", className)}
        {...props}
      >
        {children}
      </Button>
    );
  }

  const scheme = colorScheme === "dark" ? "dark" : "light";
  const tinted = tone === "brand" && !disabled;
  return (
    <GlassView
      glassEffectStyle="regular"
      colorScheme={scheme}
      isInteractive
      tintColor={tinted ? `hsl(${THEME[scheme].primary})` : undefined}
      className={cn("overflow-hidden rounded-full", className)}
    >
      <TextClassContext.Provider
        value={cn(
          "shrink text-center text-body font-semibold",
          tinted ? "text-white" : disabled ? "text-muted-foreground" : "text-foreground",
        )}
      >
        <TextScaleContext.Provider value={CONTROL_MAX_FONT_SCALE}>
          <PressableScale
            feedback="none"
            role="button"
            disabled={disabled}
            className="min-h-control-lg flex-row items-center justify-center gap-2 px-6 py-1.5"
            {...props}
          >
            {children}
          </PressableScale>
        </TextScaleContext.Provider>
      </TextClassContext.Provider>
    </GlassView>
  );
}

export { GlassButton };
export type { GlassButtonProps };
