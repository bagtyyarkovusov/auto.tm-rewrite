import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Text } from "@/components/ui/text";

interface FilteredEmptyProps {
  onReset: () => void;
}

export function FilteredEmpty({ onReset }: FilteredEmptyProps) {
  const { t } = useTranslation();
  return (
    <EmptyState illustration="search" title={t("noListingsMatch")} hint={t("tryAdjustingFilters")}>
      <Button variant="brand" size="lg" onPress={onReset}>
        <Text className="text-primary-foreground">{t("resetFilters")}</Text>
      </Button>
    </EmptyState>
  );
}
