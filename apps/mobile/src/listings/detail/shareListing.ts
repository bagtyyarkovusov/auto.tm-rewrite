import { Platform, Share } from "react-native";

import { publicWebUrl } from "../../config/publicWebUrl";

export const listingPublicUrl = (listingId: string) =>
  publicWebUrl(`/listings/${listingId}`);

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
