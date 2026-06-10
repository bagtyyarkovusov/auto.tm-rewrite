import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Wrapper around `router.back()` that checks `canGoBack()` first.
 * Falls back to `fallback` when there is no previous screen in the stack
 * (e.g. deep-link or tab direct entry).
 */
export function useSafeBack(fallback: string = "/(tabs)") {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as Parameters<typeof router.replace>[0]);
    }
  }, [router, fallback]);

  return goBack;
}
