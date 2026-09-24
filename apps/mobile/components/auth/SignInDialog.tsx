import { useRouter } from "expo-router";
import { Mail, Phone } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import {
  useAuthIntentStore,
  type AuthHref,
} from "../../src/auth/intentStore";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
  /** Screen to return to after authentication completes */
  returnTo: AuthHref;
}

export function SignInDialog({
  open,
  onOpenChange,
  title,
  description,
  returnTo,
}: SignInDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const requireSignIn = useAuthIntentStore((state) => state.requireSignIn);

  function continueWith(method: "phone" | "email") {
    onOpenChange(false);
    requireSignIn(router, { returnTo }, method);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <View className="gap-3">
          <Button
            className="h-[52px] rounded-full"
            size="lg"
            variant="brand"
            onPress={() => continueWith("phone")}
          >
            <Icon as={Phone} className="size-5 text-primary-foreground" />
            <Text>{t("continueWithPhone")}</Text>
          </Button>
          <Button
            className="h-[52px] rounded-full"
            size="lg"
            variant="brand"
            onPress={() => continueWith("email")}
          >
            <Icon as={Mail} className="size-5 text-primary-foreground" />
            <Text>{t("continueWithEmail")}</Text>
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
}
