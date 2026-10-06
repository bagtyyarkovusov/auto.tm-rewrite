import * as React from "react";
import type { ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { duration, spring, timing, useReduceMotion } from "@/lib/motion";

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

export { CrossFade, Enter, Pop, Pulse, SlideIndicator };
