import { Enums } from "@auto-tm/contracts";

import { useListingDetail } from "../api/listings/useListingDetail";
import type { ConversationDetail } from "../api/conversations/useConversation";

/**
 * The Listing contact phone the header's Call dials, or undefined when Call
 * is hidden. Call is for the buyer only, while the Listing is active and
 * allows calls (founder answer Q2 on #352). The phone comes from the Listing
 * detail request; a buyer's Sign-in Method phone is never read here.
 */
export function useConversationCallPhone(
  conversation: ConversationDetail | undefined,
): string | undefined {
  const listing = conversation?.listing;
  const isBuyer = conversation?.myRole === "buyer";
  const listingIsActive = listing?.status === Enums.ListingStatus.Active;
  const detail = useListingDetail(isBuyer && listingIsActive ? listing.id : "");

  if (!isBuyer || !listingIsActive || !detail.data) return undefined;
  if (detail.data.status !== Enums.ListingStatus.Active) return undefined;
  if (!detail.data.allowCalls || !detail.data.contactPhone) return undefined;
  return detail.data.contactPhone;
}
