import { useTranslation } from "react-i18next";

import type { ConversationSummaryData } from "../api/conversations/useConversation";
import { useDisplayName } from "../identity/useDisplayName";

/**
 * The name shown for the other participant: the one they set, or their
 * Generated Name in the app language. A deleted User has neither and keeps
 * the role word.
 */
export function usePeerName(conversation: ConversationSummaryData | undefined) {
  const { t } = useTranslation();
  const { t: tConv } = useTranslation("conversations");
  const displayNameOf = useDisplayName();
  if (!conversation) return undefined;
  if (!conversation.peer.deleted) return displayNameOf(conversation.peer);
  // The viewer's peer is the seller when the viewer is the buyer.
  return conversation.myRole === "buyer" ? t("privateSeller") : tConv("peerBuyer");
}
