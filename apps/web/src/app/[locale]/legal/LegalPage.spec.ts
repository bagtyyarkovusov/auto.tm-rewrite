import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LegalPage } from "./LegalPage";
import { privacyPolicy, termsOfService } from "./content";

const environments = ["https://staging.autotm.bagtyyar.dev", "https://autotm.bagtyyar.dev"];
afterEach(() => vi.unstubAllEnvs());

describe.each(environments)("canonical links for %s", (baseUrl) => {
  it.each(["en", "ru", "tk"] as const)("renders configured privacy and terms URLs in %s", (locale) => {
    vi.stubEnv("WEB_BASE_URL", `${baseUrl}/`);
    for (const [kind, document] of [["privacy", privacyPolicy[locale]], ["terms", termsOfService[locale]]] as const) {
      const html = renderToStaticMarkup(createElement(LegalPage, { locale, document, canonicalPath: `/legal/${kind}` }));
      expect(html).toContain(`href="${baseUrl}/${locale}/legal/${kind}"`);
      expect(html).toContain(`>${baseUrl}/${locale}/legal/${kind}</a>`);
    }
  });
});
