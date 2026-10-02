import { describe, expect, it, vi } from "vitest";

import type { IdentityCheckPort, IdentityReadPort } from "../../identity/identity.public";
import type {
  ListingSummary,
  ListingsReadPort,
} from "../../listings/domain/ports/ListingsReadPort";
import { Conversation } from "../domain/Conversation";
import type { ConversationRepository } from "../domain/ports/ConversationRepository";

import { ConversationAccessPolicy } from "./ConversationAccessPolicy";
import {
  ConversationSendPolicy,
  type SendRestriction,
} from "./ConversationSendPolicy";

const conversation = Conversation.create({
  id: "conv-1",
  listingId: "listing-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
});

const activeListing: ListingSummary = {
  id: "listing-1",
  sellerId: "seller-1",
  status: "active",
  brandId: "brand-1",
  modelId: "model-1",
  priceAmount: 100,
  priceCurrency: "TMT",
  displayPriceTmt: 100,
  cityId: "city-1",
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  allowChat: true,
};

const soldListing: ListingSummary = { ...activeListing, status: "sold" };
const archivedListing: ListingSummary = { ...activeListing, status: "archived" };
const chatOffListing: ListingSummary = { ...activeListing, allowChat: false };

const LISTINGS: Record<string, ListingSummary | null> = {
  active: activeListing,
  "banned or deleted": null,
  sold: soldListing,
  archived: archivedListing,
  "chat off": chatOffListing,
};

interface World {
  listing: ListingSummary | null;
  buyerSuspended?: boolean;
  sellerSuspended?: boolean;
  /** Who blocked whom, as "<blocker>><blocked>". */
  blocks?: string[];
}

function buildPolicy(world: World) {
  const repository = {
    findById: vi.fn().mockResolvedValue(conversation),
  } as unknown as ConversationRepository;
  const listings = {
    getListingSummary: vi.fn().mockResolvedValue(world.listing),
  } as unknown as ListingsReadPort;
  const identityCheck = {
    isSuspended: vi.fn(
      async (id: string) =>
        (id === "buyer-1" && world.buyerSuspended === true) ||
        (id === "seller-1" && world.sellerSuspended === true),
    ),
  } as unknown as IdentityCheckPort;
  const identityRead = {
    isUserBlockedBy: vi.fn(async (blockerId: string, blockedId: string) =>
      (world.blocks ?? []).includes(`${blockerId}>${blockedId}`),
    ),
  } as unknown as IdentityReadPort;

  return new ConversationSendPolicy(
    repository,
    listings,
    new ConversationAccessPolicy(identityCheck, identityRead),
  );
}

async function accepted(policy: ConversationSendPolicy, viewerId: string) {
  try {
    await policy.authorize(conversation.id, viewerId);
    return true;
  } catch {
    return false;
  }
}

describe("ConversationSendPolicy.restrictionFor", () => {
  it.each<[string, World, SendRestriction | null]>([
    ["a Message would be accepted", { listing: activeListing }, null],
    [
      "the viewer blocked the other participant",
      { listing: activeListing, blocks: ["buyer-1>seller-1"] },
      "blocked_by_me",
    ],
    [
      "the Listing is banned or deleted",
      { listing: null },
      "listing_unavailable",
    ],
    [
      "the Listing is sold",
      { listing: soldListing },
      "listing_unavailable",
    ],
    [
      "the Listing is archived",
      { listing: archivedListing },
      "listing_unavailable",
    ],
    [
      "the seller switched chat off",
      { listing: chatOffListing },
      "chat_disabled",
    ],
    [
      "the other participant is suspended",
      { listing: activeListing, sellerSuspended: true },
      "participant_unavailable",
    ],
    [
      "the viewer is suspended",
      { listing: activeListing, buyerSuspended: true },
      "participant_unavailable",
    ],
    [
      "the other participant blocked the viewer",
      { listing: activeListing, blocks: ["seller-1>buyer-1"] },
      "participant_unavailable",
    ],
  ])("when %s", async (_name, world, expected) => {
    const policy = buildPolicy(world);

    await expect(
      policy.restrictionFor(conversation, "buyer-1", world.listing),
    ).resolves.toBe(expected);
  });

  it("reports blocked_by_me first when several restrictions apply", async () => {
    const world: World = {
      listing: null,
      sellerSuspended: true,
      blocks: ["buyer-1>seller-1", "seller-1>buyer-1"],
    };

    await expect(
      buildPolicy(world).restrictionFor(conversation, "buyer-1", world.listing),
    ).resolves.toBe("blocked_by_me");
  });

  it("reports a Listing restriction before participant_unavailable", async () => {
    const gone: World = { listing: null, sellerSuspended: true };
    const chatOff: World = {
      listing: chatOffListing,
      blocks: ["seller-1>buyer-1"],
    };

    await expect(
      buildPolicy(gone).restrictionFor(conversation, "buyer-1", gone.listing),
    ).resolves.toBe("listing_unavailable");
    await expect(
      buildPolicy(chatOff).restrictionFor(
        conversation,
        "buyer-1",
        chatOff.listing,
      ),
    ).resolves.toBe("chat_disabled");
  });

  it("does not say which participant is unavailable", async () => {
    const suspended: World = { listing: activeListing, sellerSuspended: true };
    const blocked: World = {
      listing: activeListing,
      blocks: ["seller-1>buyer-1"],
    };

    const a = await buildPolicy(suspended).restrictionFor(
      conversation,
      "buyer-1",
      activeListing,
    );
    const b = await buildPolicy(blocked).restrictionFor(
      conversation,
      "buyer-1",
      activeListing,
    );

    expect(a).toBe(b);
  });

  it("reads the restriction from the seller's side too", async () => {
    const world: World = {
      listing: activeListing,
      blocks: ["buyer-1>seller-1"],
    };
    const policy = buildPolicy(world);

    await expect(
      policy.restrictionFor(conversation, "seller-1", activeListing),
    ).resolves.toBe("participant_unavailable");
    await expect(
      policy.restrictionFor(conversation, "buyer-1", activeListing),
    ).resolves.toBe("blocked_by_me");
  });
});

describe("sendRestriction and the send path", () => {
  const listingStates = Object.entries(LISTINGS);
  const flags = [false, true];

  const cases = listingStates.flatMap(([listingName, listing]) =>
    flags.flatMap((buyerSuspended) =>
      flags.flatMap((sellerSuspended) =>
        flags.flatMap((buyerBlockedSeller) =>
          flags.map((sellerBlockedBuyer) => ({
            name: [
              `listing ${listingName}`,
              buyerSuspended && "buyer suspended",
              sellerSuspended && "seller suspended",
              buyerBlockedSeller && "buyer blocked seller",
              sellerBlockedBuyer && "seller blocked buyer",
            ]
              .filter(Boolean)
              .join(", "),
            world: {
              listing,
              buyerSuspended,
              sellerSuspended,
              blocks: [
                ...(buyerBlockedSeller ? ["buyer-1>seller-1"] : []),
                ...(sellerBlockedBuyer ? ["seller-1>buyer-1"] : []),
              ],
            } satisfies World,
          })),
        ),
      ),
    ),
  );

  it.each(cases)(
    "agree for $name: null exactly when a send is accepted",
    async ({ world }) => {
      const policy = buildPolicy(world);

      for (const viewerId of ["buyer-1", "seller-1"]) {
        const restriction = await policy.restrictionFor(
          conversation,
          viewerId,
          world.listing,
        );

        expect(restriction === null).toBe(await accepted(policy, viewerId));
      }
    },
  );

  it("covers every restriction value across the matrix", async () => {
    const seen = new Set<SendRestriction | null>();
    for (const { world } of cases) {
      seen.add(
        await buildPolicy(world).restrictionFor(
          conversation,
          "buyer-1",
          world.listing,
        ),
      );
    }

    expect(seen).toEqual(
      new Set([
        null,
        "blocked_by_me",
        "listing_unavailable",
        "chat_disabled",
        "participant_unavailable",
      ]),
    );
  });
});
