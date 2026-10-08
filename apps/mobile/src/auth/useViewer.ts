import { useEffect, useState } from "react";

import { loadAuthSession, subscribeAuthSession } from "./session";
import { peekAuthSession } from "./sessionSnapshot";

export interface Viewer {
  userId: string;
}

export function useViewer(): Viewer | null | undefined {
  // What the app already read, if anything, so a screen that mounts again
  // after Android recreates the Activity does not start by loading.
  const [viewer, setViewer] = useState<Viewer | null | undefined>(() => {
    const known = peekAuthSession();
    return known ? { userId: known.user.id } : known;
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await loadAuthSession();
      if (!cancelled) {
        setViewer(session ? { userId: session.user.id } : null);
      }
    }

    void check();
    const unsubscribe = subscribeAuthSession(() => {
      void check();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return viewer;
}
