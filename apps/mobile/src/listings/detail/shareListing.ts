import { Platform, Share } from "react-native";

export const listingPublicUrl = (listingId: string) =>
  `https://auto.tm/listings/${listingId}`;

export async function shareListing(listingId: string, message: string) {
  const url = listingPublicUrl(listingId);
  try {
    await Share.share(
      Platform.OS === "android"
        ? { message: `${message} ${url}` }
        : { message, url },
    );
  } catch {
    // The native share sheet may be dismissed without sharing.
  }
}
