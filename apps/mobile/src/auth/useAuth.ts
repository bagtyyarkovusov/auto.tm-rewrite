import { useEffect, useState } from "react";

import { loadAuthSession, subscribeAuthSession } from "./session";
import { peekAuthSession } from "./sessionSnapshot";

export function useAuth() {
  // What the app already read, if anything: a screen that mounts again after
  // Android recreates the Activity starts signed in, without a loading state.
  const [known] = useState(peekAuthSession);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(
    known === undefined ? null : known !== null,
  );
  // Empty string, not null, so consumers can pass it straight to a TextInput.
  const [phone, setPhone] = useState(known?.user.phone ?? "");
  const [userId, setUserId] = useState<string | null>(known?.user.id ?? null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await loadAuthSession();
      if (!cancelled) {
        setIsAuthenticated(session !== null);
        setPhone(session?.user.phone ?? "");
        setUserId(session?.user.id ?? null);
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

  return { isAuthenticated, phone, userId };
}
