// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
  redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn() }) }));

import LoginPage from "./page";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn());
  navigation.params = new URLSearchParams();
  navigation.push.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function render() { await act(async () => root.render(<LoginPage />)); }
async function submit() {
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

describe("operator login errors", () => {
  it("resets a mounted TOTP form when an expired action redirects within login", async () => {
    navigation.params.set("mode", "totp");
    await render();
    expect(container.querySelector('input[name="code"]')).not.toBeNull();
    navigation.params = new URLSearchParams("reason=session-expired");
    await render();
    expect(container.textContent).toContain("Сессия истекла. Войдите снова.");
    expect(container.querySelector('input[name="phone"]')).not.toBeNull();
    expect(container.querySelector('input[name="code"]')).toBeNull();
  });
  it("renders the Russian expired-session message with a fresh sign-in form", async () => {
    navigation.params.set("reason", "session-expired");
    await render();
    expect(container.textContent).toContain("Сессия истекла. Войдите снова.");
    expect(container.querySelector('input[name="phone"]')).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits a wrong code through the real action and renders Russian API400 feedback", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ resendInSeconds: 60 }))
      .mockResolvedValueOnce(Response.json({ code: "INVALID_OTP", message: "Invalid OTP code" }, { status: 400 }));
    await render();
    container.querySelector<HTMLInputElement>('input[name="phone"]')!.value = "+99365000001";
    await submit();
    container.querySelector<HTMLInputElement>('input[name="code"]')!.value = "654321";
    await submit();
    expect(container.textContent).toContain("Неверный код. Попробуйте ещё раз.");
    expect(container.textContent).not.toContain("Invalid OTP code");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
