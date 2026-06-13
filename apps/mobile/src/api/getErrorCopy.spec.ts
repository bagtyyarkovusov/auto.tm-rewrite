import { describe, it, expect, vi } from "vitest";

vi.mock("./client", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      public status: number,
      message?: string,
      public details?: unknown,
    ) {
      super(message ?? code);
      this.name = "ApiError";
    }
  },
}));

import { mapErrorToCopy } from "./getErrorCopy";
import { ApiError } from "./client";

const t = (key: string) => key;

describe("mapErrorToCopy", () => {
  it("maps network errors to retryable offline copy", () => {
    const copy = mapErrorToCopy(new ApiError("NETWORK_ERROR", 0), t);
    expect(copy.title).toBe("offline");
    expect(copy.retryable).toBe(true);
  });

  it("maps 401 errors to retryable auth copy", () => {
    const copy = mapErrorToCopy(new ApiError("UNAUTHENTICATED", 401), t);
    expect(copy.title).toBe("authErrorTitle");
    expect(copy.retryable).toBe(true);
  });

  it("maps 429 errors to retryable rate-limit copy", () => {
    const copy = mapErrorToCopy(new ApiError("RATE_LIMITED", 429), t);
    expect(copy.title).toBe("rateLimitTitle");
    expect(copy.retryable).toBe(true);
  });

  it("maps 404 errors to non-retryable not-available copy", () => {
    const copy = mapErrorToCopy(new ApiError("NOT_FOUND", 404), t);
    expect(copy.title).toBe("notAvailable");
    expect(copy.retryable).toBe(false);
  });

  it("maps contract violations to non-retryable generic copy", () => {
    const copy = mapErrorToCopy(new ApiError("CONTRACT_VIOLATION", 502), t);
    expect(copy.title).toBe("somethingWentWrong");
    expect(copy.retryable).toBe(false);
  });

  it("maps contact error codes to non-retryable conversation copy", () => {
    const copy = mapErrorToCopy(
      new ApiError("LISTING_NOT_CONTACTABLE", 400),
      t,
    );
    expect(copy.title).toBe("couldNotOpenConversation");
    expect(copy.description).toBe("contactError.LISTING_NOT_CONTACTABLE");
    expect(copy.retryable).toBe(false);
  });

  it("maps forbidden with user suspended reason to non-retryable restricted copy", () => {
    const copy = mapErrorToCopy(
      new ApiError("FORBIDDEN", 403, "", { reason: "USER_SUSPENDED" }),
      t,
    );
    expect(copy.title).toBe("accountRestricted");
    expect(copy.retryable).toBe(false);
  });

  it("maps forbidden with feature disabled reason to non-retryable unavailable copy", () => {
    const copy = mapErrorToCopy(
      new ApiError("FORBIDDEN", 403, "", { reason: "CONTACT_ENABLED" }),
      t,
    );
    expect(copy.title).toBe("featureUnavailable");
    expect(copy.retryable).toBe(false);
  });

  it("maps unknown errors to retryable fallback copy", () => {
    const copy = mapErrorToCopy(new Error("boom"), t);
    expect(copy.title).toBe("somethingWentWrong");
    expect(copy.retryable).toBe(true);
  });
});
