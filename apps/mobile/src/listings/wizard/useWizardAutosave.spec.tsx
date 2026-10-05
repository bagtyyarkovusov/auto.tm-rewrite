// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

const mockMutateAsync = vi.fn();

function makeNetworkError(message = "Request timed out"): Error & { code: string; status: number } {
  const err = new Error(message);
  (err as unknown as { code: string }).code = "NETWORK_ERROR";
  (err as unknown as { status: number }).status = 0;
  return err as Error & { code: string; status: number };
}

vi.mock("../../api/listings/useUpdateDraft", () => ({
  useUpdateDraft: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    addEventListener: vi.fn(() => vi.fn()),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => {
    if (options && typeof options === "object") {
      let result = key;
      for (const [k, v] of Object.entries(options)) {
        result = result.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      }
      return result;
    }
    return key;
  } }),
}));

import { useWizardAutosave } from "./useWizardAutosave";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useWizardAutosave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("save() debounces multiple rapid calls to one mutation after 500ms", () => {
    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    act(() => {
      result.current.save({ vin: "A" });
      result.current.save({ vin: "B" });
      result.current.save({ vin: "C" });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("forceSave() triggers immediately without debounce", async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("forceSave() cancels pending debounce and saves once", async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    act(() => {
      result.current.save({ vin: "A" });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.forceSave({ vin: "B" });
    });

    // Cancel drops the pending debounce; forceSave saves exactly once
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith(
      { draftId: "draft-1", payload: { vin: "B" } },
    );
  });

  it("saveStatus transitions from idle -> saving -> saved on success", async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    expect(result.current.saveStatus).toBe("idle");

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("enters retry state on mutation error", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" }).catch(() => {});
    });

    // First failure triggers retry, so status is saving with retry message
    expect(result.current.saveStatus).toBe("saving");
    expect(result.current.saveError).toContain("retryingCount");
  });

  it("retrySave() attempts save with pending payload", async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    // Use save() to set pending payload without triggering mutateAsync (debounced)
    act(() => {
      result.current.save({ vin: "A" });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      result.current.retrySave();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith(
      { draftId: "draft-1", payload: { vin: "A" } },
    );
  });

  it("shows network error when error code is NETWORK_ERROR", async () => {
    mockMutateAsync.mockRejectedValue(makeNetworkError());

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" }).catch(() => {});
    });

    // NETWORK_ERROR is treated as a connectivity issue: immediate error state
    // with "Will retry when online" instead of entering the retry loop
    expect(result.current.saveStatus).toBe("error");
    expect(result.current.saveError).toBe("noInternetWillRetry");
  });

  it("does not call mutateAsync when draftId is empty", async () => {
    const { result } = renderHook(() => useWizardAutosave(""), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("transitions to saved even when component re-renders during save", async () => {
    let resolveMutation: (value: unknown) => void = () => {};
    mockMutateAsync.mockImplementation(
      () => new Promise((res) => { resolveMutation = res; })
    );

    const { result, rerender } = renderHook(
      () => useWizardAutosave("draft-1"),
      { wrapper }
    );

    // Start a save
    act(() => {
      result.current.save({ vin: "A" });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.saveStatus).toBe("saving");

    // Simulate a re-render (what React does when parent state changes)
    rerender();

    // Resolve the mutation
    await act(async () => {
      resolveMutation({});
    });

    // BEFORE FIX: would stay "saving" because isMountedRef was false
    // AFTER FIX: correctly transitions to "saved"
    expect(result.current.saveStatus).toBe("saved");
  });

  it("safety timeout transitions to error when mutation hangs", async () => {
    mockMutateAsync.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result, rerender } = renderHook(
      () => useWizardAutosave("draft-1"),
      { wrapper }
    );

    act(() => {
      void result.current.forceSave({ vin: "A" });
    });

    // Re-render mid-flight (simulates React behavior)
    rerender();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.saveStatus).toBe("error");
    expect(result.current.saveError).toBe("saveTimedOut");
  });
});

describe("useWizardAutosave leaving the wizard (#585)", () => {
  const withDraft = (id: string | undefined) =>
    renderHook(({ draftId }: { draftId: string | undefined }) => useWizardAutosave(draftId), {
      wrapper,
      initialProps: { draftId: id },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flush() resolves true after one request and false when it fails", async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    const { result } = withDraft("draft-1");

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.flush({ vin: "A" });
    });
    expect(saved).toBe(true);
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    mockMutateAsync.mockRejectedValue(new Error("Server error"));
    await act(async () => {
      saved = await result.current.flush({ vin: "B" });
    });
    expect(saved).toBe(false);
    expect(result.current.saveStatus).toBe("error");
  });

  it("flush() makes a single attempt: no retry loop to wait for when the seller is leaving", async () => {
    mockMutateAsync.mockRejectedValue(new Error("Server error"));
    const { result } = withDraft("draft-1");

    await act(async () => {
      await result.current.flush({ vin: "A" });
    });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(result.current.saveStatus).toBe("error");
  });

  it("flush() resolves false on a network failure", async () => {
    mockMutateAsync.mockRejectedValue(makeNetworkError());
    const { result } = withDraft("draft-1");

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.flush({ vin: "A" });
    });

    expect(saved).toBe(false);
    expect(result.current.saveError).toBe("noInternetWillRetry");
  });

  it("flush() cancels the pending debounce and sends nothing for a payload already saved", async () => {
    mockMutateAsync.mockResolvedValue({});
    const { result } = withDraft("draft-1");

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });
    act(() => {
      result.current.save({ vin: "B" });
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.flush({ vin: "A" });
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saved).toBe(true);
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("keeps saying Saved until the next change instead of clearing after two seconds", async () => {
    mockMutateAsync.mockResolvedValue({});
    const { result } = withDraft("draft-1");

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.saveStatus).toBe("saved");
  });

  it("discardPending() drops a save that has not been sent", () => {
    const { result } = withDraft("draft-1");

    act(() => {
      result.current.save({ vin: "A" });
      result.current.discardPending();
      vi.advanceTimersByTime(1000);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("starts clean for the next draft: no old status, error, retry payload or saved-payload match", async () => {
    mockMutateAsync.mockResolvedValueOnce({}).mockRejectedValue(makeNetworkError());
    const { result, rerender } = withDraft("draft-1");

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });
    await act(async () => {
      await result.current.forceSave({ vin: "B" });
    });
    expect(result.current.saveStatus).toBe("error");

    rerender({ draftId: undefined });
    expect(result.current.saveStatus).toBe("idle");
    expect(result.current.saveError).toBeNull();

    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({});
    rerender({ draftId: "draft-2" });
    await act(async () => {
      result.current.retrySave();
    });
    // Nothing is pending for draft-2, so Retry must not send draft-1's payload to it.
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // The same payload that draft-1 saved is still new to draft-2.
    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });
    expect(mockMutateAsync).toHaveBeenCalledWith({ draftId: "draft-2", payload: { vin: "A" } });
  });

  it("ignores a save that finishes after the seller left its draft", async () => {
    let resolveMutation: (value: unknown) => void = () => {};
    mockMutateAsync.mockImplementation(() => new Promise((res) => { resolveMutation = res; }));
    const { result, rerender } = withDraft("draft-1");

    act(() => {
      void result.current.forceSave({ vin: "A" });
    });
    expect(result.current.saveStatus).toBe("saving");

    rerender({ draftId: undefined });
    await act(async () => {
      resolveMutation({});
    });

    expect(result.current.saveStatus).toBe("idle");
  });

  it("retries the pending save for the current draft when the network returns", async () => {
    mockMutateAsync.mockRejectedValueOnce(makeNetworkError()).mockResolvedValue({});
    // The wizard mounts the hook before it has a draft, so the draft arrives on a later render.
    const { result, rerender } = withDraft(undefined);
    rerender({ draftId: "draft-1" });

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });
    expect(result.current.saveStatus).toBe("error");

    const listener = vi.mocked(NetInfo.addEventListener).mock.calls[0]?.[0];
    await act(async () => {
      listener?.({ isConnected: true } as never);
    });

    expect(mockMutateAsync).toHaveBeenLastCalledWith({ draftId: "draft-1", payload: { vin: "A" } });
    expect(result.current.saveStatus).toBe("saved");
  });
});
