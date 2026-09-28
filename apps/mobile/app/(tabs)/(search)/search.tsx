import { useTranslation } from "react-i18next";

import { InterimDiscoveryScreen } from "../../../src/listings/search/InterimDiscoveryScreen";

/** Search (🔍) route. Interim stand-in until #369 ships brand/model search. */
export default function SearchScreen() {
  const { t } = useTranslation();
  return <InterimDiscoveryScreen title={t("search")} />;
}
