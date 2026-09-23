import { useRouter } from "expo-router";

import {
  useAuthIntentStore,
  type AuthHref,
} from "../../src/auth/intentStore";

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
  title: string;
  description: string;
  actionLabel: string;
  /** Screen to return to after authentication completes */
  returnTo: AuthHref;
}

export function SignInDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  returnTo,
}: SignInDialogProps) {
  const router = useRouter();
  const requireSignIn = useAuthIntentStore((state) => state.requireSignIn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Button
          size="lg"
          variant="brand"
          className="h-[52px] rounded-full"
          onPress={() => {
            onOpenChange(false);
            requireSignIn(router, { returnTo });
          }}
        >
          <Text>{actionLabel}</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
