// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    expect(result.current.saveError).toContain("Retrying");
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
    expect(result.current.saveError).toBe(
      "No internet connection. Will retry when online.",
    );
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
    expect(result.current.saveError).toBe("Save timed out. Please retry.");
  });
});
