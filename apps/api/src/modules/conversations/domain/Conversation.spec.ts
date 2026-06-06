import { describe, it, expect } from "vitest";
import { Conversation } from "./Conversation";
import { CONVERSATION_ERROR_CODES } from "./types";

function makeConversation(
  overrides: Partial<{
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): Conversation {
  return Conversation.create({
    id: "conv-1",
    listingId: "listing-1",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    ...overrides,
  });
}

describe("Conversation", () => {
  describe("constructor invariants", () => {
    it("rejects self-contact when buyerId equals sellerId", () => {
      expect(() =>
        makeConversation({ buyerId: "same-user", sellerId: "same-user" }),
      ).toThrowError(CONVERSATION_ERROR_CODES.SELF_CONTACT_NOT_ALLOWED);
    });

    it("allows creation when buyer and seller are different", () => {
      const conv = makeConversation({
        buyerId: "buyer-a",
        sellerId: "seller-b",
      });
      expect(conv.buyerId).toBe("buyer-a");
      expect(conv.sellerId).toBe("seller-b");
    });
  });

  describe("isParticipant", () => {
    it("returns true for buyer", () => {
      const conv = makeConversation();
      expect(conv.isParticipant("buyer-1")).toBe(true);
    });

    it("returns true for seller", () => {
      const conv = makeConversation();
      expect(conv.isParticipant("seller-1")).toBe(true);
    });

    it("returns false for unrelated user", () => {
      const conv = makeConversation();
      expect(conv.isParticipant("random-user")).toBe(false);
    });
  });

  describe("participantRoleOf", () => {
    it("returns buyer for buyerId", () => {
      const conv = makeConversation();
      expect(conv.participantRoleOf("buyer-1")).toBe("buyer");
    });

    it("returns seller for sellerId", () => {
      const conv = makeConversation();
      expect(conv.participantRoleOf("seller-1")).toBe("seller");
    });

    it("returns null for unrelated user", () => {
      const conv = makeConversation();
      expect(conv.participantRoleOf("random-user")).toBeNull();
    });
  });
});
