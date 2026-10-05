import { useCallback } from "react";
import { List } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { useMyListingCounts } from "../../src/api/listings/useMyListingCounts";
import { useAuth } from "../../src/auth/useAuth";

import { MenuRow } from "@/components/account/MenuRow";

/**
 * Cabinet's My listings row, with the User's Listings and drafts in every
 * state as its value. No number before the first total arrives, after a
 * failed request or when it is zero; a refresh keeps the last number until
 * the next one lands. The row opens My listings either way.
 */
export function MyListingsRow() {
  const { t } = useTranslation("account");
  const { userId } = useAuth();
  const { data, isError, refetch } = useMyListingCounts(userId);

  // Cabinet is a tab and stays mounted, so refresh when it comes back into
  // view. `cancelRefetch: false` joins the mount request instead of repeating it.
  useFocusEffect(
    useCallback(() => {
      if (userId) void refetch({ cancelRefetch: false });
    }, [userId, refetch]),
  );

  return (
    <MenuRow
      icon={List}
      label={t("myListings")}
      value={userId && !isError && data?.total ? String(data.total) : undefined}
      chevron
      onPress={() => router.push("/listings/manage")}
    />
  );
}
