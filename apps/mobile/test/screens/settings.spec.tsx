import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../../app/settings.tsx"), "utf8");

describe("Settings authentication state", () => {
  it("reads authentication state before rendering account actions", () => {
    expect(source).toContain("const { isAuthenticated } = useAuth()");
  });

  it("only renders delete-account and logout actions for authenticated users", () => {
    expect(source).toContain("{isAuthenticated === true ? (");
    expect(source).toContain('router.push("/account/delete")');
    expect(source).toContain("setShowLogoutConfirm(true)");
  });
});
