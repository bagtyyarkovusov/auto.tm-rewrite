import { listDraftDirs, deleteDraftDir } from "./stagingDir";

function getOrphanStatus(
  dir: string,
  existingDraftIds: Set<string>,
  existingListingIds: Set<string>,
): boolean | null {
  if (dir.startsWith("draft-")) {
    return !existingDraftIds.has(dir.slice("draft-".length));
  }
  if (dir.startsWith("edit-")) {
    return !existingListingIds.has(dir.slice("edit-".length));
  }
  console.warn(`Skipping unknown listing staging directory: ${dir}`);
  return null;
}

export async function cleanupOrphanDraftDirs(
  existingDraftIds: Set<string>,
  existingListingIds: Set<string>,
): Promise<string[]> {
  const allDirs = await listDraftDirs();
  const orphans = allDirs.filter(
    (dir) => getOrphanStatus(dir, existingDraftIds, existingListingIds) === true,
  );

  await Promise.all(orphans.map((stagingKey) => deleteDraftDir(stagingKey)));

  return orphans;
}
