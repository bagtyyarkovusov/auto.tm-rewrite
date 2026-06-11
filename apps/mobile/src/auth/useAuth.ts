import { useEffect, useState } from "react";

import { loadAuthSession, subscribeAuthSession } from "./session";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await loadAuthSession();
      if (!cancelled) {
        setIsAuthenticated(session !== null);
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

  return { isAuthenticated };
}
