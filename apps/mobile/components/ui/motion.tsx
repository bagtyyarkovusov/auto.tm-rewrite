import * as React from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { duration, pressScale, spring, timing, useReduceMotion } from "@/lib/motion";

type MotionViewProps = ViewProps & {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Motion building blocks for screens (docs/prd/ui/76-motion.md). Each one has
 * a single job, runs on the UI thread, and animates transform and opacity
 * only. With Reduce Motion on, each renders its end state at once.
 */

/**
 * A screen's content arriving: a short fade and an 8 dp rise, once, on mount.
 * `order` staggers siblings by 40 ms each. Use it for the first paint of a
 * screen or a section, not for every row of a scrolling list.
 */
function Enter({
  order = 0,
  children,
  style: callerStyle,
  ...props
}: MotionViewProps & { order?: number }) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  React.useEffect(() => {
    progress.value = withDelay(order * 40, withTiming(1, timing("base", "enter")));
  }, [order, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  return (
    <Animated.View style={[callerStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * A one-shot confirmation: when `active` turns true the content swells and
 * settles, as the favorite heart does when it fills. Turning false is quiet.
 */
function Pop({
  active,
  children,
  style: callerStyle,
  ...props
}: MotionViewProps & { active: boolean }) {
  const scale = useSharedValue(1);
  const wasActive = React.useRef(active);

  React.useEffect(() => {
    if (active && !wasActive.current) {
      scale.value = withSequence(
        withTiming(1.28, timing("press", "enter")),
        withSpring(1, spring.pop),
      );
    }
    wasActive.current = active;
  }, [active, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[callerStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * A slow opacity pulse for something that is waiting: a placeholder, a
 * sending state. Reduce Motion leaves it still.
 */
function Pulse({ children, style: callerStyle, ...props }: MotionViewProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(0.55, { duration: duration.pulse / 2 }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[callerStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * The selected marker of a segmented row such as the tab bar: one shape that
 * slides to the selected slot instead of a highlight that jumps. `slot` is
 * the width of one slot and `index` the selected slot; the first placement is
 * immediate, later ones spring.
 *
 * `visible` hides the marker without unmounting it, for a slot that carries
 * its own marker (the tab bar's Sell button). It fades out where it stands
 * and, when it returns, fades in already at the new slot: it never slides in
 * from a slot the eye has stopped following.
 */
function SlideIndicator({
  index,
  slot,
  visible = true,
  children,
  style: callerStyle,
  ...props
}: MotionViewProps & { index: number; slot: number; visible?: boolean }) {
  const offset = useSharedValue(index * slot);
  const opacity = useSharedValue(visible ? 1 : 0);
  const placed = React.useRef(slot > 0 && visible);

  React.useEffect(() => {
    if (!visible) {
      opacity.value = withTiming(0, timing("fast", "exit"));
      placed.current = false;
      return;
    }
    const target = index * slot;
    if (placed.current) {
      offset.value = withSpring(target, spring.settle);
    } else {
      offset.value = target;
      placed.current = slot > 0;
    }
    opacity.value = withTiming(1, timing("fast", "enter"));
  }, [index, slot, visible, offset, opacity]);

  const style = useAnimatedStyle(() => ({
    width: slot,
    opacity: opacity.value,
    transform: [{ translateX: offset.value }],
  }));

  return (
    <Animated.View style={[callerStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Two drawings of one thing, for example a tab's outline and filled icon.
 * `active` cross-fades from `off` to `on`, and `on` arrives with a small
 * swell so the change reads as the answer to the tap. Both layers stay
 * mounted and stacked, so nothing is laid out again. Reduce Motion swaps them
 * at once.
 */
function CrossFade({
  active,
  on,
  off,
  style: callerStyle,
  ...props
}: Omit<MotionViewProps, "children"> & {
  active: boolean;
  on: React.ReactNode;
  off: React.ReactNode;
}) {
  const progress = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(1);
  const wasActive = React.useRef(active);

  React.useEffect(() => {
    if (active === wasActive.current) return;
    wasActive.current = active;
    progress.value = withTiming(active ? 1 : 0, timing("fast"));
    if (active) {
      scale.value = withSequence(
        withTiming(0.84, { ...timing("press"), duration: 0 }),
        withSpring(1, spring.pop),
      );
    }
  }, [active, progress, scale]);

  const onStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: scale.value }],
  }));
  const offStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  return (
    <Animated.View style={callerStyle} {...props}>
      <Animated.View style={offStyle}>{off}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, onStyle]}
      >
        {on}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Press feedback for a surface whose pressable is only a part of it: a
 * Listing card gives as a whole under a finger, while its heart and its
 * contact buttons stay controls of their own beside the pressable area.
 * Spread `handlers` on the pressable and put `style` on a `MotionView`
 * around the whole surface. `PressableScale` covers the common case where the
 * pressable is the surface.
 *
 * The scale runs on the UI thread; Reduce Motion makes it an instant change.
 */
function usePressScale(feedback: keyof typeof pressScale = "surface") {
  const pressed = useSharedValue(0);
  const target = pressScale[feedback];

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - target) }],
  }));

  const handlers = React.useMemo(
    () => ({
      onPressIn: () => {
        pressed.value = withTiming(1, timing("press"));
      },
      onPressOut: () => {
        pressed.value = withTiming(0, timing("fast"));
      },
    }),
    [pressed],
  );

  return { style, handlers };
}

/**
 * Decides, once, which of a list's cells arrive with `Enter`. The first
 * `count` cells of the first page rise in one after another; every cell that
 * mounts later (a cell scrolled back into the window, a next page) is simply
 * there. `ready` is true once the list has its first content.
 *
 * Returns the stagger order for an index, or `undefined` for no entrance.
 */
function useListEntrance(ready: boolean, count = 6) {
  const settled = React.useRef(false);

  React.useEffect(() => {
    if (!ready || settled.current) return;
    // Long enough for the first cells to mount; after it nothing enters again.
    const id = setTimeout(() => {
      settled.current = true;
    }, duration.slow);
    return () => clearTimeout(id);
  }, [ready]);

  return React.useCallback(
    (index: number) => (settled.current || index >= count ? undefined : index),
    [count],
  );
}

/**
 * A list cell that may arrive with `Enter`. The choice is made when the cell
 * mounts and never changes, so a re-render cannot replay or drop the entrance.
 */
function EnterOnce({
  order,
  children,
  ...props
}: MotionViewProps & { order?: number }) {
  const [initialOrder] = React.useState(order);
  if (initialOrder === undefined) {
    return <View {...props}>{children}</View>;
  }
  return (
    <Enter order={initialOrder} {...props}>
      {children}
    </Enter>
  );
}

/** A view that takes an animated style, for `usePressScale`. */
const MotionView = Animated.View;

/**
 * One of a row of items that come and go, such as an active filter chip. It
 * fades in when it is added and out when it is removed, and its neighbours
 * slide to close the gap instead of jumping. The slide is a transform on the
 * UI thread. Reduce Motion drops all three.
 */
function Presence({ children, ...props }: MotionViewProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(duration.fast).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(duration.base).reduceMotion(ReduceMotion.System)}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export {
  CrossFade,
  Enter,
  EnterOnce,
  MotionView,
  Pop,
  Presence,
  Pulse,
  SlideIndicator,
  useListEntrance,
  usePressScale,
};
