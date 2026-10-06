import { useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { readPickerResultsFilters } from "../../../src/listings/search/resultsRouteState";
import { BrandPicker } from "../../../src/listings/search/BrandPicker";
import { useRoutePickerActions } from "../../../src/listings/search/useRoutePickerActions";
import { useSafeBack } from "../../../src/navigation/useSafeBack";
import { HOME_HREF } from "../../../src/navigation/homeHref";
import { TabScreen } from "../../../components/navigation/TabScreen";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Brand picker, opened from Home's "Brand, model" card (and later the
 * Results card). Tapping a brand pushes the Model picker; a Recent choice
 * goes straight to Results.
 */
export default function BrandPickerScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(HOME_HREF);
  const actions = useRoutePickerActions();
  const params = useLocalSearchParams<{ returnToResults?: string; resultsState?: string }>();

  return (
    <TabScreen>
      <BrandPicker
        actions={actions}
        filters={readPickerResultsFilters(params)}
        leading={
          <Button
            variant="secondary"
            size="icon"
            className="h-11 w-11"
            onPress={goBack}
            accessibilityLabel={t("back")}
          >
            <Icon as={ChevronLeft} className="size-6 text-foreground" />
          </Button>
        }
      />
    </TabScreen>
  );
}
