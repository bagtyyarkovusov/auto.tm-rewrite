import { useEffect, useState } from "react";

import { loadAuthSession } from "./session";

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

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAuthenticated };
}
