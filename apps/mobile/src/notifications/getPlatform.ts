import { Platform } from "react-native";

export function getPlatform(): "android" | "ios" | "web" {
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
}
