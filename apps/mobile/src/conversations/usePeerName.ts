import { useTranslation } from "react-i18next";

import type { ConversationSummaryData } from "../api/conversations/useConversation";
import { useDisplayName } from "../identity/useDisplayName";

/**
 * The name shown for the other participant: the one they set, or their
 * Generated Name in the app language. A deleted User is "Deleted user", as
 * the account deletion screen promises.
 */
export function usePeerName(conversation: ConversationSummaryData | undefined) {
  const { t: tConv } = useTranslation("conversations");
  const displayNameOf = useDisplayName();
  if (!conversation) return undefined;
  if (conversation.peer.deleted) return tConv("peerDeleted");
  return displayNameOf(conversation.peer);
}
