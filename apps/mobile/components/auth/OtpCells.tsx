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
        focus: () => {
          if (!disabled) {
            inputRef.current?.focus();
          }
        },
        shake: runShake,
      }),
      [runShake, disabled],
    );

    function handleChange(text: string) {
      if (disabled) return;
      const digits = text.replace(/\D/g, "").slice(0, length);
      onChange(digits);
    }

    return (
      <Pressable onPress={() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      }}>
        <Animated.View
          className="flex-row gap-2"
          style={{ transform: [{ translateX: shake }] }}
        >
          {Array.from({ length }, (_, index) => {
            const digit = value[index];
            const focused = index === value.length && !disabled;
            const errored = hasError === true;

            return (
              <View
                className={cn(
                  "aspect-square flex-1 items-center justify-center rounded-lg border-[1.5px] bg-background",
                  errored && !disabled && "border-2 border-destructive",
                  !errored && focused && "border-2 border-foreground",
                  !errored && !focused && digit && "border-foreground",
                  !errored && !focused && !digit && "border-input",
                  disabled && "opacity-60",
                )}
                key={index}
                pointerEvents="none"
              >
                <Text
                  className={cn(
                    "font-mono text-2xl font-medium leading-tight text-foreground",
                    errored && !disabled && "text-destructive",
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
