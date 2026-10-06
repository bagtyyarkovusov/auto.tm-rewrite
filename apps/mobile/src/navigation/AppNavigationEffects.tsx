import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";

import { ApiError } from "../api/client";
import { clearAuthSession, subscribeAuthUserChange } from "../auth/session";
import { isConversationPath } from "../conversations/conversationRoutes";
import { useDirectMessagePushRouting } from "../notifications/useDirectMessagePushRouting";

/** Keep navigation and session subscriptions out of the root shell and its Stack. */
export function AppNavigationEffects() {
  const queryClient = useQueryClient();
  useDirectMessagePushRouting();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // A session the API ended (a refused token refresh) leaves the previous
  // User's data in the cache; Log out and Delete account clear it themselves.
  // It is dropped when another User signs in, not when the session ends:
  // clearing then would silently cancel the request whose 401 ended it, and the
  // listener below would never see that error and never offer sign-in.
  useEffect(
    () => subscribeAuthUserChange(() => queryClient.clear()),
    [queryClient],
  );

  useEffect(() => {
    let redirecting = false;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action?.type !== "error") return;
      const error = event.query.state.error;
      if (!redirecting && error instanceof ApiError && error.code === "UNAUTHENTICATED") {
        void clearAuthSession();
        // This screen offers sign-in and preserves its Conversation return intent.
        if (isConversationPath(pathnameRef.current)) return;
        redirecting = true;
        queueMicrotask(() => router.replace("/(auth)/phone"));
      }
    });
    return unsubscribe;
  }, [queryClient]);
  return null;
}
