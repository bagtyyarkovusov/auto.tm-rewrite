import { create } from "zustand";

/**
 * What Profile's notice line says after a Sign-in Method was added or changed,
 * after the name editor saved a name, or after a photo was set or removed.
 */
export type ProfileNotice =
  | {
      kind: "added" | "changed";
      /** The new value, masked as Profile shows it. */
      value: string;
    }
  | { kind: "nameSaved" | "photoSaved" | "photoRemoved" };

interface ProfileNoticeStore {
  notice: ProfileNotice | null;
  show(notice: ProfileNotice): void;
  clear(): void;
}

/**
 * Hands the result of a Sign-in Method, name or photo change to Profile, which
 * shows it in the page for a few seconds. Kept outside the route so it
 * survives the dismissal.
 */
export const profileNoticeStore = create<ProfileNoticeStore>()((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  clear: () => set({ notice: null }),
}));
