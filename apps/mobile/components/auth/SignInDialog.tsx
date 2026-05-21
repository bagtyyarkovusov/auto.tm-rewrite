import { useRouter } from "expo-router";

import { useAuthIntentStore } from "../../src/auth/intentStore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  /** Route to return to after auth completes */
  returnPath?: string;
  /** Optional callback to re-trigger the originally-intended action */
  replay?: () => Promise<void>;
}

export function SignInDialog({
  open,
  onOpenChange,
  title = "Sign in required",
  description = "Sign in to access this feature.",
  actionLabel = "Continue with phone",
  returnPath,
  replay,
}: SignInDialogProps) {
  const router = useRouter();
  const setIntent = useAuthIntentStore((state) => state.setIntent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Button
          size="lg"
          variant="default"
          className="h-[52px] rounded-full"
          onPress={() => {
            onOpenChange(false);
            setIntent({ returnPath, replay });
            router.push("/(auth)/phone");
          }}
        >
          <Text>{actionLabel}</Text>
        </Button>
        {__DEV__ && (
          <Button
            size="lg"
            variant="ghost"
            onPress={() => {
              onOpenChange(false);
            }}
          >
            <Text className="text-muted-foreground">Skip auth (dev)</Text>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
