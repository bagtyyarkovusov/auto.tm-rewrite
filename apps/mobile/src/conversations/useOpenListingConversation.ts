import { useRef } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useOpenConversation } from "../api/conversations/useOpenConversation";
import { seedConversationDetail } from "../api/conversations/useConversation";

/**
 * Opens (or creates) the Conversation about a Listing and pushes it by ID,
 * seeding the by-ID cache with the summary the open returned. An
 * optional `draft` rides along as a route param for the composer to show; it is
 * never sent. Contact bar Message and Ask the seller share this, so a signed-in
 * tap and a replayed pending action run the same code. Callers own the sign-in
 * check, because a replay must not re-check a flag that is refreshed
 * asynchronously after the session is stored.
 */
export function useOpenListingConversation(listingId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const openConversation = useOpenConversation();
  const lastDraft = useRef<string | undefined>(undefined);

  const open = (draft?: string) => {
    lastDraft.current = draft;
    openConversation.mutate(
      { listingId },
      {
        onSuccess: (data) => {
          seedConversationDetail(queryClient, data);
          router.push({
            pathname: "/conversations/[id]",
            params: { id: data.id, ...(draft ? { draft } : {}) },
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
