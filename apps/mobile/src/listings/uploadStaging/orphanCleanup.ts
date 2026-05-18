import { listDraftDirs, deleteDraftDir } from "./stagingDir";

export async function cleanupOrphanDraftDirs(existingDraftIds: string[]): Promise<string[]> {
  const allDirs = await listDraftDirs();
  const orphans = allDirs.filter((dir) => !existingDraftIds.includes(dir));

  await Promise.all(orphans.map((draftId) => deleteDraftDir(draftId)));

  return orphans;
}
