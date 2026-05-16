import "../global.css";

import { Stack, router } from "expo-router";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { NAV_THEME } from "../lib/theme";
import { ApiError } from "../src/api/client";
import { clearAuthSession } from "../src/auth/session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // Don't retry auth failures or contract violations
        if (error instanceof ApiError) {
          if (error.status === 401 || error.code === "CONTRACT_VIOLATION") {
            return false;
          }
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? "light";

  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const error = event.query.state.error;
      if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
        void clearAuthSession();
        router.replace("/(auth)/phone");
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME[scheme]}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(auth)/phone"
            options={{ presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            name="(auth)/otp"
            options={{ presentation: "fullScreenModal" }}
          />
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
