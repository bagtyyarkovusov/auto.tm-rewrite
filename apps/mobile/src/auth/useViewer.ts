import { useEffect, useState } from "react";

import { loadAuthSession, subscribeAuthSession } from "./session";

export interface Viewer {
  userId: string;
}

export function useViewer(): Viewer | null | undefined {
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);

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
