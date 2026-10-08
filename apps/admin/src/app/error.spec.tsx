// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

import ErrorPage from "./error";

it("renders a Russian error page and retries without exposing the API error", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  const reset = vi.fn();
  const retry = vi.fn();
  try {
    await act(async () => root.render(<ErrorPage error={new Error("secret API detail")} reset={reset} unstable_retry={retry} />));
    expect(container.textContent).toContain("Временно недоступно. Попробуйте ещё раз.");
    expect(container.textContent).not.toContain("secret API detail");
    const button = container.querySelector("button");
    if (!button) throw new Error("missing retry button");
    await act(async () => button.click());
    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
