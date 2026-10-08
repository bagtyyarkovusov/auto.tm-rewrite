import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  Keyboard,
  TextInput,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

type Measurable = { measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void };

/** Space kept between the focused field and whatever covers the list's bottom edge. */
const FIELD_GAP = 16;

/**
 * Where to scroll so a field ending at `fieldBottom` (in content coordinates)
 * clears `covered` dp at the bottom of a `viewport` dp tall list. Returns
 * null when the field is already clear.
 */
export function offsetToReveal(fieldBottom: number, scrollY: number, viewport: number, covered: number): number | null {
  const visibleBottom = scrollY + viewport - covered - FIELD_GAP;
  return fieldBottom > visibleBottom ? fieldBottom - (viewport - covered - FIELD_GAP) : null;
}

/**
 * Scrolls the focused text field into view when the keyboard opens. Android
 * is edge to edge, so the system no longer pans the window for the keyboard,
 * and a bar that floats over the list's bottom edge (`covered` dp) would sit
 * on the field being typed in.
 */
export function useKeepFocusedInputVisible(scrollRef: RefObject<ScrollView | null>, covered: number) {
  const scrollY = useRef(0);
  const viewport = useRef(0);
  // Read when the timer fires: the bar's height can change as the keyboard
  // opens, and a new subscription would cancel the pending scroll.
  const coveredRef = useRef(covered);
  coveredRef.current = covered;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      // The list shrinks for the keyboard a frame or two after this event.
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const scroll = scrollRef.current;
        // The public instance is the host view on the new architecture; older
        // builds reach it through getNativeScrollRef.
        const host = (scroll as unknown as Measurable | null)?.measureInWindow
          ? (scroll as unknown as Measurable)
          : ((scroll as unknown as { getNativeScrollRef?: () => Measurable | null } | null)?.getNativeScrollRef?.() ?? null);
        if (!input || !scroll || !host) return;
        host.measureInWindow((_sx, top) => {
          input.measureInWindow((_x, y, _width, height) => {
            // Window coordinates turn into content coordinates through the scroll offset.
            const fieldBottom = y + height - top + scrollY.current;
            const target = offsetToReveal(fieldBottom, scrollY.current, viewport.current, coveredRef.current);
            if (target !== null) scroll.scrollTo({ y: target, animated: true });
          });
        });
      }, 120);
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [scrollRef]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
  }, []);

  return { onScroll, onLayout, scrollEventThrottle: 16 } as const;
}
