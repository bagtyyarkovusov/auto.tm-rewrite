import { Redirect, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { readPickerResultsFilters } from "../../../src/listings/search/resultsRouteState";
import { ModelPicker } from "../../../src/listings/search/ModelPicker";
import { BRANDS_PATH } from "../../../src/listings/search/pickerActions";
import { useRoutePickerActions } from "../../../src/listings/search/useRoutePickerActions";
import { useSafeBack } from "../../../src/navigation/useSafeBack";
import { TabScreen } from "../../../components/navigation/TabScreen";

import { BackButton } from "@/components/navigation/StackHeader";

/**
 * Model picker for one brand (`brandId`), optionally with models already
 * ticked (`modelIds`, comma-separated). Ends with "Show N listings" and
 * "More filters"; "Change brand" returns to the Brand picker.
 */
export default function ModelPickerScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(BRANDS_PATH);
  const actions = useRoutePickerActions();
  const params = useLocalSearchParams<{ brandId?: string; modelIds?: string; returnToResults?: string; resultsState?: string }>();
  const brandId = params.brandId ?? "";
  const modelIdsParam = params.modelIds ?? "";
  const initialModelIds = useMemo(
    () => modelIdsParam.split(",").filter(Boolean),
    [modelIdsParam],
  );

  // A link without a brand has nothing to list: pick the brand first.
  if (!brandId) return <Redirect href={BRANDS_PATH} />;

  return (
    // The picker pins its own bar above the tab bar and brings the fade under it.
    <TabScreen edgeFade={false}>
      <ModelPicker
        key={brandId}
        actions={actions}
        brandId={brandId}
        initialModelIds={initialModelIds}
        filters={readPickerResultsFilters(params)}
        leading={<BackButton onPress={goBack} accessibilityLabel={t("back")} />}
      />
    </TabScreen>
  );
}
