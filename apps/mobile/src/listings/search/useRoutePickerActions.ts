import { useMemo } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";

import { createRoutePickerActions, type PickerRouter } from "./pickerActions";
import { readResultsRouteState, writeResultsRouteState } from "./resultsRouteState";
import { useRecentChoicesStore } from "./recentSearches";

/** expo-router's imperative router, narrowed to what the pickers use. */
const pickerRouter: PickerRouter = {
  push: (href) => router.push(href as Href),
  dismissAll: () => router.dismissAll(),
  dismissTo: (href) => router.dismissTo(href as Href),
  canDismiss: () => router.canDismiss(),
};

/** Picker actions for the pushed Brand and Model picker screens. */
export function useRoutePickerActions() {
  const params = useLocalSearchParams<{ returnToResults?: string; resultsState?: string }>();
  const resultsState = useMemo(() => {
    if (params.returnToResults !== "1") return undefined;
    try {
      const raw: unknown = JSON.parse(params.resultsState ?? "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
      const strings = Object.fromEntries(Object.entries(raw).filter(([, value]) => typeof value === "string"));
      return writeResultsRouteState(readResultsRouteState(strings));
    } catch { return undefined; }
  }, [params.returnToResults, params.resultsState]);
  const record = useRecentChoicesStore((s) => s.record);
  return useMemo(
    () =>
      createRoutePickerActions({
        router: pickerRouter,
        resultsState,
        record: (choice) => void record(choice),
      }),
    [record, resultsState],
  );
}
