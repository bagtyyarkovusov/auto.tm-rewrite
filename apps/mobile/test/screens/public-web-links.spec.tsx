import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import * as Linking from "expo-linking";

import { AuthEntryScreen } from "../../components/auth/AuthEntryScreen";
import SettingsScreen from "../../app/settings";
import { fireEvent, renderMobile, routerMock } from "../render";

vi.mock("../../src/auth/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../../src/auth/useLogout", () => ({ useLogout: () => ({ mutate: vi.fn() }) }));

const profiles = [
  ["staging", "https://staging.autotm.bagtyyar.dev"],
  ["production-smoke", "https://autotm.bagtyyar.dev"],
  ["production", "https://autotm.bagtyyar.dev"],
] as const;
const eas = JSON.parse(readFileSync(resolve(__dirname, "../../eas.json"), "utf8"));

afterEach(() => vi.unstubAllEnvs());

describe.each(profiles)("%s public web links", (profile, baseUrl) => {
  it("supplies the public web URL in the build profile", () => {
    expect(eas.build[profile].env.EXPO_PUBLIC_WEB_URL).toBe(baseUrl);
  });

  it.each(["en", "ru", "tk"])("opens localized privacy and terms from settings and sign-in in %s", (locale) => {
    vi.stubEnv("EXPO_PUBLIC_WEB_URL", baseUrl);
    const settings = renderMobile(<SettingsScreen />, { locale });
    fireEvent.press(settings.getByRole("button", { name: settings.i18n.t("account:privacyPolicy") }));
    expect(Linking.openURL).toHaveBeenLastCalledWith(`${baseUrl}/${locale}/legal/privacy`);
    fireEvent.press(settings.getByRole("button", { name: settings.i18n.t("account:termsOfService") }));
    expect(Linking.openURL).toHaveBeenLastCalledWith(`${baseUrl}/${locale}/legal/terms`);
    fireEvent.press(settings.getByRole("button", { name: settings.i18n.t("account:deleteAccount") }));
    expect(routerMock.push).toHaveBeenCalledWith("/account/delete");
    settings.unmount();

    const auth = renderMobile(<AuthEntryScreen method="email" title="Sign in" helper="Email" canSubmit={false} isSubmitting={false} onSubmit={async () => {}}>{null}</AuthEntryScreen>, { locale });
    fireEvent.press(auth.getByText(auth.i18n.t("auth:privacy")));
    expect(Linking.openURL).toHaveBeenLastCalledWith(`${baseUrl}/${locale}/legal/privacy`);
    fireEvent.press(auth.getByText(auth.i18n.t("auth:terms")));
    expect(Linking.openURL).toHaveBeenLastCalledWith(`${baseUrl}/${locale}/legal/terms`);
  });
});
