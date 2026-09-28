import { Stack } from "expo-router";

// Home stays under anything pushed into the Search tab, including deep links
// straight to Results, so Back always has somewhere to go.
export const unstable_settings = {
  anchor: "index",
};

/**
 * The Search tab's own stack. Home is its first screen; Results and the
 * discovery screens push on top while the tab bar stays visible. Tapping the
 * active Search tab pops back to Home (the native stack handles `tabPress`),
 * and the other tabs keep their own history.
 */
export default function SearchStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
