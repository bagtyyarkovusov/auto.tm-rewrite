import * as FileSystem from "expo-file-system/legacy";

const STAGING_ROOT = `${FileSystem.documentDirectory}listing-staging/`;

export function getStagingPath(draftId: string, photoId: string): string {
  return `${STAGING_ROOT}${draftId}/${photoId}.jpg`;
}

export function getDraftDir(draftId: string): string {
  return `${STAGING_ROOT}${draftId}/`;
}

export async function ensureDraftDir(draftId: string): Promise<void> {
  const dir = getDraftDir(draftId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function deleteDraftDir(draftId: string): Promise<void> {
  const dir = getDraftDir(draftId);
  const info = await FileSystem.getInfoAsync(dir);
  if (info.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}

export async function listDraftDirs(): Promise<string[]> {
  const rootInfo = await FileSystem.getInfoAsync(STAGING_ROOT);
  if (!rootInfo.exists) {
    return [];
  }
  return FileSystem.readDirectoryAsync(STAGING_ROOT);
}

export async function listOrphanDirs(existingDraftIds: string[]): Promise<string[]> {
  const dirs = await listDraftDirs();
  return dirs.filter((dir) => !existingDraftIds.includes(dir));
}
