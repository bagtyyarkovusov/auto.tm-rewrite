// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockMutate = vi.fn();

vi.mock("../../api/listings/useUpdateDraft", () => ({
  useUpdateDraft: () => ({
    mutate: mockMutate,
  }),
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

    expect(mockMutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("forceSave() triggers immediately without debounce", () => {
    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    act(() => {
      result.current.forceSave({ vin: "A" });
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("forceSave() flushes pending debounce", () => {
    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    act(() => {
      result.current.save({ vin: "A" });
    });

    expect(mockMutate).not.toHaveBeenCalled();

    act(() => {
      // forceSave flushes the pending debounce AND triggers its own call
      void result.current.forceSave({ vin: "B" });
    });

    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenLastCalledWith(
      { draftId: "draft-1", payload: { vin: "B" } },
      expect.any(Object),
    );
  });

  it("isSaving is true during mutation and false after", () => {
    let settleFn: (() => void) | undefined;
    mockMutate.mockImplementation((_vars, opts) => {
      settleFn = () => opts?.onSettled?.();
    });

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    act(() => {
      result.current.forceSave({ vin: "A" });
    });

    expect(result.current.isSaving).toBe(true);

    act(() => {
      settleFn?.();
    });

    expect(result.current.isSaving).toBe(false);
  });

  it("saveError is set on mutation error", async () => {
    const error = new Error("Save failed");
    mockMutate.mockImplementation(async (_vars, opts) => {
      await Promise.resolve();
      opts?.onError?.(error);
      opts?.onSettled?.();
    });

    const { result } = renderHook(() => useWizardAutosave("draft-1"), {
      wrapper,
    });

    await act(async () => {
      await result.current.forceSave({ vin: "A" }).catch(() => {});
    });

    expect(result.current.saveError).toEqual(error);
  });
});
