// @vitest-environment happy-dom

import { readFileSync } from "fs";
import { resolve } from "path";

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDeleteMessage } from "./useDeleteMessage";

const source = readFileSync(resolve(__dirname, "./useDeleteMessage.ts"), "utf-8");

const mockDelete = vi.fn();

vi.mock("../client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public status: number,
      message?: string,
    ) {
      super(message ?? code);
      this.name = "ApiError";
    }
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function makeDeleteResponse(overrides?: Record<string, unknown>) {
  return {
    messageId: "msg-1",
    deletedAt: "2026-06-01T12:05:00.000Z",
    ...overrides,
  };
}

describe("useDeleteMessage", () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it("deletes message and returns parsed response", async () => {
    mockDelete.mockResolvedValue(makeDeleteResponse());

    const { result } = renderHook(() => useDeleteMessage(), { wrapper });

    result.current.mutate({ conversationId: "conv-1", messageId: "msg-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.messageId).toBe("msg-1");
    expect(mockDelete).toHaveBeenCalledWith(
      "/conversations/conv-1/messages/msg-1",
      expect.any(Object),
    );
  });

  it("surfaces forbidden error from API", async () => {
    mockDelete.mockRejectedValue(
      new (class extends Error {
        constructor() {
          super("You can only delete your own messages");
          this.name = "ApiError";
        }
        code = "FORBIDDEN";
        status = 403;
      })(),
    );

    const { result } = renderHook(() => useDeleteMessage(), { wrapper });

    result.current.mutate({ conversationId: "conv-1", messageId: "msg-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as unknown as { code: string }).code).toBe(
      "FORBIDDEN",
    );
  });

  it("invalidates messages query on success", () => {
    expect(source).toContain(
      "queryKeys.conversations.messages(variables.conversationId)",
    );
  });

  it("invalidates conversation list on success", () => {
    expect(source).toContain("queryKeys.conversations.list()");
  });

  it("invalidates conversation detail on success", () => {
    expect(source).toContain(
      "queryKeys.conversations.detail(variables.conversationId)",
    );
  });
});
