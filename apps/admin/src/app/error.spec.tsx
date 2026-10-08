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
  try {
    await act(async () => root.render(<ErrorPage error={new Error("secret API detail")} reset={reset} />));
    expect(container.textContent).toContain("Временно недоступно. Попробуйте ещё раз.");
    expect(container.textContent).not.toContain("secret API detail");
    const retry = container.querySelector("button");
    if (!retry) throw new Error("missing retry button");
    await act(async () => retry.click());
    expect(reset).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
