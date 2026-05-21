import { forwardRef } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends TextInputProps {
  hasError?: boolean;
  prefix?: string;
}

const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  ({ hasError, prefix = "+993", className, ...props }, ref) => {
    return (
      <View
        className={cn(
          "h-[52px] flex-row items-center overflow-hidden rounded-lg bg-card",
          hasError ? "border-2 border-destructive" : "border border-input",
          className,
        )}
      >
        <View className="h-full justify-center border-r border-border px-3.5">
          <Text className="text-base text-foreground" style={{ fontFamily: "UberMoveMono-Medium" }}>
            {prefix}
          </Text>
        </View>
        <TextInput
          ref={ref}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base text-foreground placeholder:text-muted-foreground/50"
          style={{ paddingTop: 0, paddingBottom: 0, lineHeight: 20, fontFamily: "UberMoveMono-Regular" }}
          {...props}
        />
      </View>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
export type { PhoneInputProps };
