import { useQuery } from "@tanstack/react-query";
import { ExchangeRatesSchemas } from "@auto-tm/contracts";

import { apiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useExchangeRates() {
  return useQuery({
    queryKey: queryKeys.exchangeRates.all(),
    queryFn: () =>
      apiClient.get(
        "/exchange-rates",
        ExchangeRatesSchemas.ExchangeRatesResponseSchema,
        { auth: false },
      ),
    staleTime: 60_000,
  });
}
