import { describe, expect, it } from "vitest";

import { rehydrateMessageContext } from "./PrismaContentReportRepository";

describe("rehydrateMessageContext", () => {
  it("restores JSON date strings before returning the domain snapshot", () => {
    const context = rehydrateMessageContext({
      messageId: "message-1",
      conversationId: "conversation-1",
      listingId: "listing-1",
      buyerId: "buyer-1",
      sellerId: "seller-1",
      senderId: "seller-1",
      createdAt: "2026-07-18T14:20:00.000Z",
      body: "Reported message",
      deletedAt: null,
      surroundingMessages: [
        {
          id: "message-0",
          senderId: "buyer-1",
          createdAt: "2026-07-18T14:19:00.000Z",
          body: "Context",
          deletedAt: "2026-07-18T14:19:30.000Z",
        },
      ],
    });

    expect(context?.createdAt).toBeInstanceOf(Date);
    expect(context?.deletedAt).toBeNull();
    expect(context?.surroundingMessages[0]?.createdAt).toBeInstanceOf(Date);
    expect(context?.surroundingMessages[0]?.deletedAt).toBeInstanceOf(Date);
  });
});
