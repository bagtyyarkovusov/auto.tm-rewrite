import { useTranslation } from "react-i18next";

import { InterimDiscoveryScreen } from "../../../src/listings/search/InterimDiscoveryScreen";

/** Brand picker route. Interim stand-in until #368 ships the picker. */
export default function BrandPickerScreen() {
  const { t } = useTranslation();
  return <InterimDiscoveryScreen title={t("brandModel")} />;
}
