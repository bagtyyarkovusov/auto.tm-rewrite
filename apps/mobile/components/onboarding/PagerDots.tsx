import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

const DOT = 6;
const CURRENT_DOT = 24;
const OTHER_OPACITY = 0.35;

function Dot({
  index,
  offset,
  pageWidth,
}: {
  index: number;
  offset: SharedValue<number>;
  pageWidth: number;
}) {
  // Follows the finger: the dot grows as its page comes in, not after it lands.
  const style = useAnimatedStyle(() => {
    const distance = pageWidth > 0 ? Math.min(Math.abs(offset.value / pageWidth - index), 1) : index;
    return {
      width: CURRENT_DOT - (CURRENT_DOT - DOT) * distance,
      opacity: 1 - (1 - OTHER_OPACITY) * distance,
    };
  });

  return <Animated.View style={style} className="h-1.5 rounded-full bg-foreground" />;
}

/**
 * Where the person is in the onboarding pager. The current page is the long
 * dot, so position does not rest on colour alone. Screen readers get one
 * element with the position in words; it is not a control.
 *
 * `offset` is the pager's horizontal scroll offset, read on the UI thread.
 */
export function PagerDots({
  count,
  offset,
  pageWidth,
  label,
}: {
  count: number;
  offset: SharedValue<number>;
  pageWidth: number;
  label: string;
}) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      className="h-1.5 flex-row gap-1.5"
    >
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} offset={offset} pageWidth={pageWidth} />
      ))}
    </View>
  );
}
