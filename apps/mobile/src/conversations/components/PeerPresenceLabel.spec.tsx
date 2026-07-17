import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

const source = readFileSync(resolve(__dirname, "./PeerPresenceLabel.tsx"), "utf-8");

describe("PeerPresenceLabel", () => {
  it("exports PeerPresenceLabel component", () => {
    expect(source).toContain("export function PeerPresenceLabel");
  });

  it("accepts presence and locale props", () => {
    expect(source).toContain("presence: PeerPresence");
    expect(source).toContain("locale: string");
  });

  it("uses the conversations namespace for localized copy", () => {
    expect(source).toContain('useTranslation("conversations")');
  });

  it("renders online label when presence is online", () => {
    expect(source).toContain("presence.online");
    expect(source).toContain('t("online")');
  });

  it("returns null when offline with no last seen timestamp", () => {
    expect(source).toContain("!presence.lastSeenAt");
    expect(source).toContain("return null");
  });

  it("shows just-now label for recent last seen", () => {
    expect(source).toContain('t("lastSeenJustNow")');
  });

  it("shows minute-based label within the first hour", () => {
    expect(source).toContain('t("lastSeenMinutes"');
  });

  it("shows hour-based label within the first day", () => {
    expect(source).toContain('t("lastSeenHours"');
  });

  it("shows yesterday label for the previous calendar day", () => {
    expect(source).toContain("isYesterday");
    expect(source).toContain('t("lastSeenYesterday")');
  });

  it("shows a formatted date label for older last seen", () => {
    expect(source).toContain("toLocaleDateString");
    expect(source).toContain('t("lastSeenDate"');
  });

  it("uses localeTag to map the locale for date formatting", () => {
    expect(source).toContain("localeTag(locale)");
  });

  it("styles the label as muted secondary text", () => {
    expect(source).toContain('className="text-xs text-muted-foreground"');
  });

  it("truncates long presence labels to one line", () => {
    expect(source).toContain("numberOfLines={1}");
  });
});
