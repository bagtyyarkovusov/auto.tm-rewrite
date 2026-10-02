import { describe, expect, it } from "vitest";

import { showQuickReplies } from "./showQuickReplies";

const ready = { ready: true, sendRestriction: null, listingStatus: "active", messageCount: 0 } as const;

describe("showQuickReplies", () => {
  it("shows them in an empty, loaded, open Conversation", () => {
    expect(showQuickReplies(ready)).toBe(true);
  });

  it.each([
    ["still loading", { ready: false }],
    ["it has Messages", { messageCount: 1 }],
    ["the Listing is sold", { listingStatus: "sold" }],
    ["the Listing is removed from sale", { listingStatus: "archived" }],
    ["the viewer blocked the participant", { sendRestriction: "blocked_by_me" }],
    ["the Listing is unavailable", { sendRestriction: "listing_unavailable" }],
    ["chat is off", { sendRestriction: "chat_disabled" }],
    ["the participant is unavailable", { sendRestriction: "participant_unavailable" }],
  ] as const)("hides them when %s", (_why, change) => {
    expect(showQuickReplies({ ...ready, ...change })).toBe(false);
  });
});
