// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";

import { apiClient } from "../../api/client";
import { useDiscardDraft } from "../../api/listings/useDiscardDraft";

import { useWizardAutosave } from "./useWizardAutosave";

// The root layout tells TanStack Query when the device is offline. A mutation in
// the default network mode pauses then and its promise never settles, so ✕, which
// awaits the save or the delete, could never finish. These run the real hooks.
vi.mock("../../api/client", () => ({
  apiClient: { delete: vi.fn(), patch: vi.fn() },
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: vi.fn(() => vi.fn()) },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function networkError(): Error {
  return Object.assign(new Error("Network request failed"), { code: "NETWORK_ERROR", status: 0 });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** What the promise did within a moment; "paused" when it did nothing. */
async function outcomeOf(promise: Promise<unknown>): Promise<unknown> {
  let outcome: unknown = "paused";
  void promise.then(
    (value) => { outcome = value; },
    () => { outcome = "rejected"; },
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return outcome;
}

describe("closing the Sell wizard while offline", () => {
  beforeEach(() => {
    vi.mocked(apiClient.delete).mockReset().mockRejectedValue(networkError());
    vi.mocked(apiClient.patch).mockReset().mockRejectedValue(networkError());
    onlineManager.setOnline(false);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it("the save made by ✕ fails at once instead of waiting for the network", async () => {
    const { result } = renderHook(() => useWizardAutosave("draft-1"), { wrapper });

    let flushed: Promise<boolean> | undefined;
    act(() => {
      flushed = result.current.flush({ brandId: "brand-1" });
    });

    expect(await outcomeOf(flushed as Promise<boolean>)).toBe(false);
    expect(apiClient.patch).toHaveBeenCalledOnce();
    expect(result.current.saveStatus).toBe("error");
  });

  it("deleting an untouched new Listing fails at once instead of waiting for the network", async () => {
    const { result } = renderHook(() => useDiscardDraft(), { wrapper });

    let deleted: Promise<unknown> | undefined;
    act(() => {
      deleted = result.current.mutateAsync("draft-1");
    });

    expect(await outcomeOf(deleted as Promise<unknown>)).toBe("rejected");
    expect(apiClient.delete).toHaveBeenCalledOnce();
  });
});
