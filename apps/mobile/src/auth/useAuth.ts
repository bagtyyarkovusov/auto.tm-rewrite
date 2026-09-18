import { useEffect, useState } from "react";

import { loadAuthSession, subscribeAuthSession } from "./session";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Empty string, not null, so consumers can pass it straight to a TextInput.
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await loadAuthSession();
      if (!cancelled) {
        setIsAuthenticated(session !== null);
        setPhone(session?.user.phone ?? "");
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

  return { isAuthenticated, phone };
}
