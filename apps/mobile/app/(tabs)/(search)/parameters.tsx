import { useLocalSearchParams } from "expo-router";

import { SearchParametersForm } from "../../../src/listings/search/SearchParametersForm";
import { readResultsRouteState, type ResultsRouteState } from "../../../src/listings/search/resultsRouteState";
import { HOME_HREF } from "../../../src/navigation/homeHref";
import { useSafeBack } from "../../../src/navigation/useSafeBack";

/** Search parameters: the full-screen filter form. Results and the Model picker open it with their filters; Search's All filters opens it empty. */
export default function SearchParametersScreen() {
  const goBack = useSafeBack(HOME_HREF);
  const params = useLocalSearchParams<ResultsRouteState & { returnToResults?: string }>();
  return <SearchParametersForm initial={readResultsRouteState(params)} returnToResults={params.returnToResults === "1"} onBack={goBack} />;
}
