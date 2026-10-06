import { View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Phone, MessageCircle } from "lucide-react-native";
import { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/useAuth";
import {
  useAuthIntentStore,
  useReplayAuthAction,
} from "../../auth/intentStore";
import { useOpenListingConversation } from "../../conversations/useOpenListingConversation";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ContactCtaBarProps {
  listingId: string;
  contactPhone?: string;
  allowCalls: boolean;
  allowChat: boolean;
  status: Enums.ListingStatus;
  /** The full detail has not loaded: both actions stay disabled until it does. */
  pending?: boolean;
  /** `viewer` sits on the black photo viewer: no SMS caption, light-on-dark buttons. */
  variant?: "bar" | "viewer";
  /** Runs before a Message starts, e.g. to close the photo viewer over the screen. */
  onBeforeMessage?: () => void;
  /**
   * False for a second bar on the same screen, so a Message replayed after
   * sign-in opens one Conversation, not two.
   */
  replayAuth?: boolean;
}

export function ContactCtaBar({
  listingId,
  contactPhone,
  allowCalls,
  allowChat,
  status,
  pending = false,
  variant = "bar",
  onBeforeMessage,
  replayAuth = true,
}: ContactCtaBarProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const conversation = useOpenListingConversation(listingId);
  const { t } = useTranslation();
  const listingHref = `/(public)/listings/${listingId}` as const;
  const isSold = status === Enums.ListingStatus.Sold;
  const isArchived = status === Enums.ListingStatus.Archived;
  const canCall =
    !pending && allowCalls && !!contactPhone && !isSold && !isArchived;
  const canMessage = !pending && allowChat && !isSold && !isArchived;
  const onDark = variant === "viewer";

  const handleCall = async () => {
    if (!canCall || !contactPhone) return;
    const url = `tel:${contactPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  // `conversation.open` is the action body without the auth gate, so one
  // code path serves a signed-in tap and a pending action replayed after
  // sign-in. A replay must not re-check `isAuthenticated`: that
  // flag is refreshed asynchronously and is still false for a beat after the
  // session is stored, while the API client already reads the new token per
  // request.
  useReplayAuthAction("message", replayAuth ? listingId : undefined, () =>
    conversation.open(),
  );

  const handleMessage = () => {
    if (!canMessage) return;
    onBeforeMessage?.();

    if (isAuthenticated === false) {
      useAuthIntentStore.getState().requireSignIn(router, {
        returnTo: listingHref,
        action: { kind: "message", listingId },
      });
      return;
    }

    if (isAuthenticated === true) {
      conversation.open();
    }
  };

  return (
    <View>
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Button
          variant={canCall ? "brand" : "secondary"}
          size="lg"
          className={cn(
            "flex-1",
            onDark && !canCall && "border-transparent bg-white/15 disabled:border-transparent disabled:bg-white/15",
          )}
          onPress={handleCall}
          disabled={!canCall}
        >
          <Icon as={Phone} className="size-5" />
          <Text numberOfLines={1} className={cn(onDark && !canCall && "text-white/60")}>
            {t("call")}
          </Text>
        </Button>

        <Button
          variant={canMessage ? "default" : "secondary"}
          size="lg"
          className={cn(
            "flex-1",
            onDark && "border-transparent bg-white/15 disabled:border-transparent disabled:bg-white/15",
          )}
          disabled={!canMessage || conversation.isPending}
          onPress={handleMessage}
          accessibilityLabel={t("message")}
          accessibilityState={{
            disabled: !canMessage || conversation.isPending,
          }}
        >
          <Icon
            as={MessageCircle}
            className={
              onDark
                ? "size-5 text-white"
                : canMessage
                  ? "size-5 text-background"
                  : "size-5 text-muted-foreground"
            }
          />
          <Text numberOfLines={1} className={cn(onDark && "text-white")}>
            {t("message")}
          </Text>
        </Button>
      </View>
      {canCall && !onDark && (
        <Text className="px-4 pb-2 text-center text-caption text-muted-foreground">
          {t("contactSmsCaption")}
        </Text>
      )}

      {conversation.error && (
        <View className="px-4 pb-3">
          <ErrorState
            compact
            error={conversation.error}
            onRetry={conversation.retry}
          />
        </View>
      )}
    </View>
  );
}
