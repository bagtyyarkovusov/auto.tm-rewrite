import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";

import { ApiError } from "../api/client";
import {
  clearAuthSession,
  loadAuthSession,
  subscribeAuthSession,
  subscribeAuthUserChange,
} from "../auth/session";
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

  // A 401 on any request, query or mutation, ends the session and offers
  // sign-in, so an account edit with an expired token cannot strand the User.
  useEffect(() => {
    let redirecting = false;
    const onError = (error: unknown) => {
      if (!redirecting && error instanceof ApiError && error.code === "UNAUTHENTICATED") {
        void clearAuthSession();
        // This screen offers sign-in and preserves its Conversation return intent.
        if (isConversationPath(pathnameRef.current)) return;
        redirecting = true;
        queueMicrotask(() => router.replace("/(auth)/phone"));
      }
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "error") onError(event.query.state.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") onError(event.mutation.state.error);
    });
    // A new sign-in re-arms the redirect, so a later expiry offers sign-in again.
    const unsubscribeSession = subscribeAuthSession(() => {
      void loadAuthSession()
        .then((session) => {
          if (session) redirecting = false;
        })
        .catch(() => {});
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
      unsubscribeSession();
    };
  }, [queryClient]);
  return null;
}
