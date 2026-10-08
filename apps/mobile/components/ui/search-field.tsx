import { Search } from "lucide-react-native";
import * as React from "react";
import { TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { withFontFace } from "@/lib/font";
import { cn } from "@/lib/utils";

type SearchFieldProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> & {
    /** Classes for the field's surface: margins, width. */
    className?: string;
  };

/**
 * A search field: the filled tonal field of `Input` with a magnifier at its
 * leading edge, so a field that filters a list says so before it is read.
 * Focus draws the same foreground edge as `Input`. Every `TextInput` prop,
 * the ref, the placeholder and the accessibility label reach the input.
 * See docs/prd/ui/components/78-02-input.md.
 */
function SearchField({ className, onFocus, onBlur, ...props }: SearchFieldProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View
      className={cn(
        "min-h-control-md flex-row items-center gap-2.5 rounded-lg border border-transparent bg-secondary pl-4 pr-3",
        focused && "border-foreground",
        className,
      )}
    >
      <Icon as={Search} className="size-5 text-muted-foreground" strokeWidth={2.2} />
      <TextInput
        className={withFontFace(
          "min-w-0 flex-1 self-stretch py-0 font-sans text-body leading-5 text-foreground placeholder:text-muted-foreground",
        )}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
    </View>
  );
}

export { SearchField };
export type { SearchFieldProps };
