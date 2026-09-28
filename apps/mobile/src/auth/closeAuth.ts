import type { Router } from "expo-router";

import { useAuthIntentStore } from "./intentStore";

type AuthCloseNavigator = Pick<
  Router,
  "back" | "canGoBack" | "dismissTo" | "replace"
>;

export function closeAuth(navigator: AuthCloseNavigator): void {
  const authIntent = useAuthIntentStore.getState();

  if (authIntent.intent) {
    authIntent.cancelSignIn(navigator);
    return;
  }

  if (navigator.canGoBack()) {
    navigator.back();
    return;
  }

  navigator.replace("/(tabs)");
}
