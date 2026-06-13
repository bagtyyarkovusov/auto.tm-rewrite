import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./ErrorState.tsx"), "utf-8");

describe("ErrorState", () => {
  it("imports useErrorCopy from useErrorCopy", () => {
    expect(source).toContain('import { useErrorCopy } from "@/src/api/useErrorCopy"');
  });

  it("accepts error, onRetry, and compact props", () => {
    expect(source).toContain("error: unknown");
    expect(source).toContain("onRetry?: () => void");
    expect(source).toContain("compact?: boolean");
  });

  it("renders a compact inline layout when compact is true", () => {
    expect(source).toContain("if (compact)");
    expect(source).toContain("flex-row");
  });

  it("marks error surfaces as accessibility alerts", () => {
    expect(source).toContain('accessibilityRole="alert"');
  });

  it("renders a centered full-screen layout by default", () => {
    expect(source).toContain("flex-1 items-center justify-center");
  });

  it("shows a retry button only when the error is retryable and onRetry is provided", () => {
    expect(source).toContain("copy.retryable && onRetry");
  });

  it("displays the mapped title and description", () => {
    expect(source).toContain("{copy.title}");
    expect(source).toContain("{copy.description}");
  });
});
