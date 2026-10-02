import type { ConversationsSchemas, Enums } from "@auto-tm/contracts";

import { isClosedForContact } from "@/src/listings/detail/closedListing";

interface QuickRepliesInput {
  /** The Conversation and its Messages have loaded without error. */
  ready: boolean;
  sendRestriction?: ConversationsSchemas.SendRestriction | null;
  listingStatus?: Enums.ListingStatus;
  messageCount: number;
}

/**
 * Quick replies open an empty Conversation. They are not offered when sending
 * is restricted, or when the Listing is sold or removed from sale: the buyer
 * can still write, but there is nothing left to ask about (#352 D1).
 */
export function showQuickReplies({
  ready,
  sendRestriction,
  listingStatus,
  messageCount,
}: QuickRepliesInput): boolean {
  if (!ready || messageCount > 0 || sendRestriction) return false;
  return !(listingStatus && isClosedForContact(listingStatus));
}
