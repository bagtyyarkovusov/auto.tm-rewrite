import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { clampScale, clampTranslation, doubleTapScale } from "./zoomMath";

export interface ZoomableImageProps {
  width: number;
  height: number;
  /** True for the photo the viewer is on; any other photo snaps back to fitted. */
  active: boolean;
  onZoomChange: (zoomed: boolean) => void;
  children: ReactNode;
}

/** Below this a pinch counts as back at fitted size. */
const FITTED = 1.02;

/**
 * Pinch, drag and double-tap zoom for one photo. Gestures run on the UI thread
 * through Gesture Handler and Reanimated shared values; only the zoomed or
 * fitted flag crosses back to React, so the viewer can lock paging while a
 * photo is zoomed. Dragging is enabled only while zoomed, so a fitted photo
 * never competes with the pager's swipe.
 */
export function ZoomableImage({
  width,
  height,
  active,
  onZoomChange,
  children,
}: ZoomableImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reportZoom = useCallback(
    (next: boolean) => {
      setZoomed(next);
      onZoomChange(next);
    },
    [onZoomChange],
  );

  // A photo the viewer has moved off returns to fitted without telling the
  // viewer: it already unlocked paging when the buyer picked another photo.
  useEffect(() => {
    if (active) return;
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
    setZoomed(false);
  }, [active, scale, savedScale, translateX, translateY, savedX, savedY]);

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onUpdate((event) => {
        scale.value = clampScale(savedScale.value * event.scale);
      })
      .onEnd(() => {
        const fitted = scale.value < FITTED;
        if (fitted) {
          scale.value = withTiming(1);
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
          savedScale.value = 1;
          savedX.value = 0;
          savedY.value = 0;
        } else {
          savedScale.value = scale.value;
          savedX.value = clampTranslation(translateX.value, scale.value, width);
          savedY.value = clampTranslation(translateY.value, scale.value, height);
          translateX.value = withTiming(savedX.value);
          translateY.value = withTiming(savedY.value);
        }
        scheduleOnRN(reportZoom, !fitted);
      });

    const pan = Gesture.Pan()
      .enabled(zoomed)
      .onUpdate((event) => {
        translateX.value = clampTranslation(
          savedX.value + event.translationX,
          scale.value,
          width,
        );
        translateY.value = clampTranslation(
          savedY.value + event.translationY,
          scale.value,
          height,
        );
      })
      .onEnd(() => {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((_event, success) => {
        if (!success) return;
        const next = doubleTapScale(scale.value);
        scale.value = withTiming(next);
        savedScale.value = next;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
        scheduleOnRN(reportZoom, next > 1);
      });

    return Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [
    zoomed,
    width,
    height,
    reportZoom,
    scale,
    savedScale,
    translateX,
    translateY,
    savedX,
    savedY,
  ]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}
