import { useRouter } from "expo-router";

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
}

export function SignInDialog({
  open,
  onOpenChange,
  title = "Sign in required",
  description = "Sign in to access this feature.",
  actionLabel = "Continue with phone",
}: SignInDialogProps) {
  const router = useRouter();

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
          onPress={() => {
            onOpenChange(false);
            router.push("/(auth)/phone");
          }}
        >
          <Text>{actionLabel}</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
