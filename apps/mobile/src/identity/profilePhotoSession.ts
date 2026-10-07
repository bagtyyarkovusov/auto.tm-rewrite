import { loadAuthSession, subscribeAuthSession, type StoredAuthSession } from "../auth/session";

export class PhotoSessionEnded extends Error {
  constructor() { super("Profile Photo session ended"); }
}

/** An in-flight photo must never inherit a later User's credentials or cache. */
export interface ProfilePhotoSession {
  readonly userId: string;
  current(): Promise<StoredAuthSession>;
  dispose(): void;
}

export async function capturePhotoSession(): Promise<ProfilePhotoSession> {
  const initial = await loadAuthSession();
  if (!initial) throw new PhotoSessionEnded();
  let ended = false;
  const check = async () => {
    const session = await loadAuthSession();
    if (!session || session.user.id !== initial.user.id) ended = true;
    return session;
  };
  const unsubscribe = subscribeAuthSession(() => {
    void check().catch(() => { ended = true; });
  });
  return {
    userId: initial.user.id,
    async current() {
      const session = await check();
      if (ended || !session) throw new PhotoSessionEnded();
      return session;
    },
    dispose() { ended = true; unsubscribe(); },
  };
}
