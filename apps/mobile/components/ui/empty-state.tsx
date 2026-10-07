import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { Enter } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type EmptyStateProps = ViewProps & {
  className?: string;
  /** The composition above the title. Leave it out where the state is a brief note inside a list. */
  illustration?: IllustrationName;
  title: string;
  hint?: string;
  /** The state's action, usually one full-width button. */
  children?: ReactNode;
};

/**
 * A screen with nothing to show yet, or one that needs a sign-in: a
 * composition, a bold title, up to two lines of explanation and the action.
 * It fills the space under the screen's own title and sits a little above the
 * middle, where the eye lands. See docs/prd/ui/75-illustration-style.md.
 */
function EmptyState({
  illustration,
  title,
  hint,
  children,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View
      className={cn("flex-1 items-center justify-center px-8 pb-12 pt-6", className)}
      {...props}
    >
      <Enter className="w-full items-center">
        {illustration ? <Illustration name={illustration} className="mb-6" /> : null}
        <Text className="text-center font-heading text-headline font-semibold text-foreground">
          {title}
        </Text>
        {hint ? (
          <Text className="mt-2 text-center text-body text-muted-foreground">{hint}</Text>
        ) : null}
        {children ? <View className="mt-7 w-full gap-3">{children}</View> : null}
      </Enter>
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
