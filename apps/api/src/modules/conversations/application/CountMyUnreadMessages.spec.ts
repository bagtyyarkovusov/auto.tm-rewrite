import { describe, it, expect, vi } from "vitest";

import type { ConversationRepository } from "../domain/ports/ConversationRepository";

import { CountMyUnreadMessages } from "./CountMyUnreadMessages";

function build(total: number) {
  const countAllUnreadMessages = vi.fn().mockResolvedValue(total);
  const countUnreadMessages = vi.fn().mockResolvedValue(0);
  const listForUser = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
  const repository = {
    countAllUnreadMessages,
    countUnreadMessages,
    listForUser,
  } as unknown as ConversationRepository;
  return {
    useCase: new CountMyUnreadMessages(repository),
    countAllUnreadMessages,
    countUnreadMessages,
    listForUser,
  };
}

describe("CountMyUnreadMessages", () => {
  it("returns the repository total for the signed-in User", async () => {
    const { useCase, countAllUnreadMessages } = build(7);

    await expect(useCase.execute({ userId: "user-1" })).resolves.toEqual({
      count: 7,
    });
    expect(countAllUnreadMessages).toHaveBeenCalledWith("user-1");
  });

  it("returns 0 for a User with no unread Messages or no Conversations", async () => {
    const { useCase } = build(0);

    await expect(useCase.execute({ userId: "user-2" })).resolves.toEqual({
      count: 0,
    });
  });

  it("asks for the total once, without a read per Conversation", async () => {
    const { useCase, countAllUnreadMessages, countUnreadMessages, listForUser } =
      build(3);

    await useCase.execute({ userId: "user-1" });

    expect(countAllUnreadMessages).toHaveBeenCalledTimes(1);
    expect(countUnreadMessages).not.toHaveBeenCalled();
    expect(listForUser).not.toHaveBeenCalled();
  });
});
