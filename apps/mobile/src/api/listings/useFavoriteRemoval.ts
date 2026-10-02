import type { ListingsSchemas } from "@auto-tm/contracts";

// Red checkpoint stub: the behaviour arrives with the implementation.
export function useFavoriteRemoval(_options: { delayMs?: number; onFailed?: (listing: ListingsSchemas.FavoriteListingSummary) => void } = {}) {
  return {
    hiddenIds: new Set<string>() as ReadonlySet<string>,
    pendingId: null as string | null,
    remove: (_listing: ListingsSchemas.FavoriteListingSummary) => {},
    undo: () => false,
    flush: () => {},
  };
}
