import { Alert } from "react-native";
import * as Linking from "expo-linking";
import type { TFunction } from "i18next";

/** Launching an intent does not need Android package visibility. Only querying it does. */
export async function openSellerDialer(phone: string, t: TFunction): Promise<void> {
  const trimmed = phone.trim();
  const dialString = `${trimmed.startsWith("+") ? "+" : ""}${trimmed.replace(/\D/g, "")}`;
  try {
    await Linking.openURL(`tel:${dialString}`);
  } catch {
    Alert.alert(t("call"), t("listingCallFailed", { phone }));
  }
}
