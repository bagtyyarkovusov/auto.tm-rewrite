import { useRef } from "react";
import { useRouter } from "expo-router";

import { useOpenConversation } from "../api/conversations/useOpenConversation";

/**
 * Opens (or creates) the Conversation about a Listing and pushes it. An
 * optional `draft` rides along as a route param for the composer to show; it is
 * never sent. Contact bar Message and Ask the seller share this, so a signed-in
 * tap and a replayed pending action run the same code. Callers own the sign-in
 * check, because a replay must not re-check a flag that is refreshed
 * asynchronously after the session is stored.
 */
export function useOpenListingConversation(listingId: string) {
  const router = useRouter();
  const openConversation = useOpenConversation();
  const lastDraft = useRef<string | undefined>(undefined);

  const open = (draft?: string) => {
    lastDraft.current = draft;
    openConversation.mutate(
      { listingId },
      {
        onSuccess: (data) => {
          const listing = data.listing;
          router.push({
            pathname: "/conversations/[id]",
            params: {
              id: data.id,
              listingId: listing?.id ?? "",
              brandId: listing?.brandId ?? "",
              modelId: listing?.modelId ?? "",
              year: listing?.year ? String(listing.year) : "",
              displayPriceTmt: listing?.displayPriceTmt
                ? String(listing.displayPriceTmt)
                : "",
              priceCurrency: listing?.priceCurrency ?? "",
              coverMediaKey: listing?.coverMediaKey ?? "",
              status: listing?.status ?? "",
              ...(draft ? { draft } : {}),
            },
          });
        },
      },
    );
  };

  return {
    open,
    /** Opens again with the same draft after a failure. */
    retry: () => open(lastDraft.current),
    isPending: openConversation.isPending,
    error: openConversation.error,
  };
}
