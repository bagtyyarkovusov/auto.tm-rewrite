import { View } from "react-native";
import { useRouter } from "expo-router";
import type { Enums } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/useAuth";
import {
  useAuthIntentStore,
  useReplayAuthAction,
} from "../../auth/intentStore";
import {
  QUICK_REPLIES,
  type QuickReplyIntent,
} from "../../conversations/quickReplyIntents";
import { useOpenListingConversation } from "../../conversations/useOpenListingConversation";

import { isClosedForContact } from "./closedListing";

import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export interface AskSellerChipsProps {
  listingId: string;
  isOwner: boolean;
  status: Enums.ListingStatus;
  /** The seller's chat setting; with chat off there is no Conversation to open. */
  allowChat: boolean;
}

/**
 * "Ask the seller" quick questions on Listing detail. The four chips are the
 * QuickReplies intents; a tap opens the Conversation with that question typed
 * into the composer and unsent. Signed out, the choice is parked behind
 * sign-in and finished on return. Hidden for the owner, for sold and archived
 * Listings (closed for contact), and when the seller turned chat off, as the
 * Message button is.
 */
export function AskSellerChips({
  listingId,
  isOwner,
  status,
  allowChat,
}: AskSellerChipsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { t: tConversation } = useTranslation("conversations");
  const { isAuthenticated } = useAuth();
  const conversation = useOpenListingConversation(listingId);

  const questionFor = (intent: QuickReplyIntent) => {
    const reply = QUICK_REPLIES.find((candidate) => candidate.key === intent);
    return reply ? tConversation(reply.translationKey) : undefined;
  };

  // Also the replay body, which must not re-check `isAuthenticated`: it is
  // refreshed asynchronously and is still false for a beat after sign-in.
  useReplayAuthAction("ask", listingId, (action) => {
    if (action.kind !== "ask") return;
    conversation.open(questionFor(action.intent));
  });

  if (isOwner || isClosedForContact(status) || !allowChat) return null;

  const ask = (intent: QuickReplyIntent) => {
    if (isAuthenticated === false) {
      useAuthIntentStore.getState().requireSignIn(router, {
        returnTo: `/(public)/listings/${listingId}`,
        action: { kind: "ask", listingId, intent },
      });
      return;
    }
    if (isAuthenticated === true) {
      conversation.open(questionFor(intent));
    }
  };

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold">{t("askTheSeller")}</Text>
      <View className="flex-row flex-wrap gap-2">
        {QUICK_REPLIES.map((reply) => (
          <Button
            key={reply.key}
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={conversation.isPending}
            onPress={() => ask(reply.key)}
            accessibilityLabel={tConversation(reply.translationKey)}
          >
            <Text>{tConversation(reply.translationKey)}</Text>
          </Button>
        ))}
      </View>
      {conversation.error && (
        <ErrorState compact error={conversation.error} onRetry={conversation.retry} />
      )}
    </View>
  );
}
