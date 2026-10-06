import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Text } from "@/components/ui/text";

export function FeedEmpty() {
  const { t } = useTranslation();
  return (
    <EmptyState illustration="listings" title={t("noListings")} hint={t("beFirstToSell")}>
      <Button variant="brand" size="pill" onPress={() => router.push("/(tabs)/sell")}>
        <Text className="text-primary-foreground">{t("sellCar")}</Text>
      </Button>
    </EmptyState>
  );
}
