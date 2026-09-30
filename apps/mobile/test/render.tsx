import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { resources } from "../src/i18n/resources";

export function renderMobile(element: ReactElement) {
  const i18n = createInstance();
  void i18n.init({ lng: "en", resources, defaultNS: "common", initImmediate: false });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </I18nextProvider>,
  );
}
