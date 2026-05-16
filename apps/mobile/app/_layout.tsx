import "../global.css";

import { Stack } from "expo-router";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { NAV_THEME } from "../lib/theme";

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? "light";

  return (
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
  );
}
