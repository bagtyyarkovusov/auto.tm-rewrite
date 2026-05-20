// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockMutateAsync = vi.fn();

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

  it("forceSave() flushes pending debounce", async () => {
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

    // The flushed debounce + forceSave both call mutateAsync
    expect(mockMutateAsync).toHaveBeenCalledTimes(2);
  });

  it("saveStatus transitions from idle -> saving -> idle on success", async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    expect(result.current.saveStatus).toBe("idle");

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });

    expect(result.current.saveStatus).toBe("idle");
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

  it("does not call mutateAsync when draftId is empty", async () => {
    const { result } = renderHook(() => useWizardAutosave(""), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
