import { Platform } from "react-native";

export function getPlatform(): "android" | "ios" | "web" {
  if (Platform.OS === "ios") {
    return "ios";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return "web";
}
