import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import {
  Animated,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface OtpCellsProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  length?: number;
  disabled?: boolean;
}

interface OtpCellsRef {
  focus: () => void;
  shake: () => void;
}

const OtpCells = forwardRef<OtpCellsRef, OtpCellsProps>(
  ({ value, onChange, hasError, length = 6, disabled }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const shake = useRef(new Animated.Value(0)).current;

    const runShake = useCallback(() => {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, {
          duration: 50,
          toValue: -8,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          duration: 50,
          toValue: 8,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          duration: 50,
          toValue: -6,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          duration: 50,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    }, [shake]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        shake: runShake,
      }),
      [runShake],
    );

    function handleChange(text: string) {
      const digits = text.replace(/\D/g, "").slice(0, length);
      onChange(digits);
    }

    return (
      <Pressable onPress={() => !disabled && inputRef.current?.focus()}>
        <Animated.View
          className="flex-row gap-2"
          style={{ transform: [{ translateX: shake }] }}
        >
          {Array.from({ length }, (_, index) => {
            const digit = value[index];
            const focused = index === value.length;
            const errored = hasError === true;

            return (
              <View
                className={cn(
                  "aspect-square flex-1 items-center justify-center rounded-lg border bg-card",
                  errored && "border-2 border-destructive",
                  !errored && focused && "border-2 border-foreground",
                  !errored && !focused && digit && "border border-foreground",
                  !errored &&
                    !focused &&
                    !digit &&
                    "border border-border bg-muted",
                  disabled && "opacity-50",
                )}
                key={index}
                pointerEvents="none"
              >
                <Text
                  className={cn(
                    "text-2xl font-semibold leading-tight font-uber-mono",
                    errored ? "text-destructive" : "text-foreground",
                    digit ? "opacity-100" : "opacity-0",
                  )}
                >
                  {digit ?? ""}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        <TextInput
          autoComplete="sms-otp"
          caretHidden
          className="absolute inset-0 opacity-0"
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={length}
          onChangeText={handleChange}
          ref={inputRef}
          textContentType="oneTimeCode"
          value={value}
        />
      </Pressable>
    );
  },
);

OtpCells.displayName = "OtpCells";

export { OtpCells };
export type { OtpCellsRef, OtpCellsProps };
