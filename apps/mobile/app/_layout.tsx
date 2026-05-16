import "../global.css";

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
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
  );
}
