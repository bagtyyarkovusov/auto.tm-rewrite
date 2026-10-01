import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement, PropsWithChildren } from "react";
import { afterEach } from "vitest";

import { resources } from "../src/i18n/resources";

const clients = new Set<QueryClient>();
afterEach(() => { clients.forEach((client) => client.clear()); clients.clear(); });

export function renderMobile(element: ReactElement, { locale = "en" } = {}) {
  const i18n = createInstance();
  void i18n.init({ lng: locale, resources, defaultNS: "common", initImmediate: false });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  clients.add(queryClient);
  function Wrapper({ children }: PropsWithChildren) {
    return <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nextProvider>;
  }
  return { ...render(element, { wrapper: Wrapper }), queryClient, i18n };
}

export { fireEvent, act, within } from "@testing-library/react-native";
export { routerMock, routeParams } from "./native-setup";

/** The first of several matches; a query that returned none would already have thrown. */
export const first = <T,>(items: T[]): T => items[0] as T;
