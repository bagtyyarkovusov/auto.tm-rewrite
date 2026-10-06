import type { PrismaClient } from "../../generated/prisma/client/client";

import { DEMO_ID_PREFIX, DEMO_OBJECT_PREFIX } from "./marker";
import { refused, type DemoInventoryResult } from "./result";
import type { ObjectStore } from "./storage";

/**
 * Deletes exactly what the seed created, and what reviewers and testers left on it.
 *
 * It starts from the marker (`marker.ts`): the Users whose id is in the demo namespace. From them
 * it reaches their Listings, and from those the media rows, favourites, Conversations with their
 * messages, Inspection Interests and reports. Deleting the sellers cascades to all of these except
 * reports, which have no foreign key and are deleted by target in the same transaction. Then it
 * deletes every stored object under the demo key prefix.
 *
 * It never matches a row by content, so a real user's Listing, favourite and Conversation are out
 * of reach. A real user's favourite of, or Conversation about, a demo Listing goes with that
 * Listing.
 *
 * It refuses, deleting nothing, when a demo seller has a Sign-in Method: that account may now
 * belong to a person. A second run finds nothing and reports zeros.
 */
export async function removeDemoInventory(deps: {
  prisma: PrismaClient;
  storage: ObjectStore;
}): Promise<DemoInventoryResult> {
  const { prisma, storage } = deps;

  const sellers = await prisma.user.findMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
    select: { id: true, phone: true, email: true },
  });
  if (sellers.some((seller) => seller.phone !== null || seller.email !== null)) {
    return refused("remove", "a seeded seller has gained a Sign-in Method; resolve that account by hand first");
  }
  const sellerIds = sellers.map((seller) => seller.id);

  const listingIds = (
    await prisma.listing.findMany({ where: { sellerId: { in: sellerIds } }, select: { id: true } })
  ).map((listing) => listing.id);
  const conversationIds = (
    await prisma.conversation.findMany({
      where: { OR: [{ listingId: { in: listingIds } }, { sellerId: { in: sellerIds } }, { buyerId: { in: sellerIds } }] },
      select: { id: true },
    })
  ).map((conversation) => conversation.id);
  const messageIds = (
    await prisma.message.findMany({ where: { conversationId: { in: conversationIds } }, select: { id: true } })
  ).map((message) => message.id);
  const reportTargets = {
    OR: [
      { targetType: "listing", targetId: { in: listingIds } },
      { targetType: "user", targetId: { in: sellerIds } },
      { targetType: "message", targetId: { in: messageIds } },
    ],
  };

  const [photos, favorites, inspectionInterests] = await Promise.all([
    prisma.listingMedia.count({ where: { listingId: { in: listingIds } } }),
    prisma.favorite.count({ where: { listingId: { in: listingIds } } }),
    prisma.inspectionInterest.count({ where: { listingId: { in: listingIds } } }),
  ]);

  const [reports] = await prisma.$transaction([
    prisma.contentReport.deleteMany({ where: reportTargets }),
    prisma.user.deleteMany({ where: { id: { in: sellerIds } } }),
  ]);

  const keys = await storage.list(DEMO_OBJECT_PREFIX);
  await storage.remove(keys);

  const counts = {
    sellers: sellerIds.length,
    listings: listingIds.length,
    photos,
    objects: keys.length,
    favorites,
    conversations: conversationIds.length,
    messages: messageIds.length,
    reports: reports.count,
    inspectionInterests,
  };
  return {
    exitCode: 0,
    message:
      `Demo inventory removed ${counts.sellers} sellers, ${counts.listings} Listings, ${counts.photos} media rows, ` +
      `${counts.objects} stored objects, ${counts.favorites} favourites, ${counts.conversations} Conversations ` +
      `(${counts.messages} messages), ${counts.reports} reports and ${counts.inspectionInterests} Inspection Interests`,
    counts,
  };
}
