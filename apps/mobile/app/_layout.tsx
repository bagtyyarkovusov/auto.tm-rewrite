import "../global.css";

import { Stack, router } from "expo-router";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useColorScheme } from "nativewind";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { NetInfoState } from "@react-native-community/netinfo";

import { NAV_THEME } from "../lib/theme";
import { ApiError } from "../src/api/client";
import { clearAuthSession } from "../src/auth/session";

import { ToastProvider } from "@/components/ui/toast";

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

function isOnline(state: NetInfoState): boolean {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return false;
  }
  // isInternetReachable can be null while the OS is still deciding.
  // Do not pause all queries during that unknown window.
  return true;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? "light";

   
  const [fontsLoaded] = useFonts({
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMove-Bold": require("../assets/fonts/UberMoveBold.otf"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMove-Medium": require("../assets/fonts/UberMoveMedium.otf"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMoveText-Bold": require("../assets/fonts/UberMoveTextBold.otf"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMoveText-Light": require("../assets/fonts/UberMoveTextLight.otf"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMoveText-Medium": require("../assets/fonts/UberMoveTextMedium.otf"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "UberMoveText-Regular": require("../assets/fonts/UberMoveTextRegular.otf"),
    ...(Platform.OS === "ios"
      ? {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          "UberMoveMono-Medium": require("../assets/fonts/UberMoveMono-Medium.woff2"),
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          "UberMoveMono-Regular": require("../assets/fonts/UberMoveMono-Regular.woff2"),
        }
      : {}),
  });

  // Prevent rendering until fonts are loaded to avoid layout shift
  if (!fontsLoaded) {
    return null;
  }

  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      onlineManager.setOnline(isOnline(state));
    });

    const unsub = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(isOnline(state));
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let redirecting = false;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action?.type !== "error") return;
      const error = event.query.state.error;
      if (
        !redirecting &&
        error instanceof ApiError &&
        error.code === "UNAUTHENTICATED"
      ) {
        redirecting = true;
        void clearAuthSession();
        queueMicrotask(() => {
          router.replace("/(auth)/phone");
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME[scheme]}>
        <ToastProvider>
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
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
