import { describe, it, expect } from "vitest";
import { canTransition } from "./ListingStatus";

describe("canTransition", () => {
  it("allows active → sold", () => {
    expect(canTransition("active", "sold")).toBe(true);
  });

  it("allows active → archived", () => {
    expect(canTransition("active", "archived")).toBe(true);
  });

  it("allows sold → archived", () => {
    expect(canTransition("sold", "archived")).toBe(true);
  });

  it("allows archived → active", () => {
    expect(canTransition("archived", "active")).toBe(true);
  });

  it("disallows active → active", () => {
    expect(canTransition("active", "active")).toBe(false);
  });

  it("disallows sold → active", () => {
    expect(canTransition("sold", "active")).toBe(false);
  });

  it("disallows sold → sold", () => {
    expect(canTransition("sold", "sold")).toBe(false);
  });

  it("disallows archived → sold", () => {
    expect(canTransition("archived", "sold")).toBe(false);
  });

  it("disallows archived → archived", () => {
    expect(canTransition("archived", "archived")).toBe(false);
  });

  it("disallows banned → sold", () => {
    expect(canTransition("banned", "sold")).toBe(false);
  });

  it("disallows banned → archived", () => {
    expect(canTransition("banned", "archived")).toBe(false);
  });

  it("disallows active → banned via canTransition (admin only)", () => {
    expect(canTransition("active", "banned")).toBe(false);
  });
});
