import { create } from "zustand";

export interface AuthIntent {
  /** Route to navigate to after auth completes */
  returnPath?: string;
  /** Optional callback to re-trigger the originally-intended action */
  replay?: () => Promise<void>;
}

interface AuthIntentStore {
  intent: AuthIntent | null;
  setIntent(intent: AuthIntent): void;
  clearIntent(): void;
  consumeAndReplay(router: { replace: (path: string) => void }): Promise<void>;
}

export const useAuthIntentStore = create<AuthIntentStore>()((set, get) => ({
  intent: null,

  setIntent(intent) {
    set({ intent });
  },

  clearIntent() {
    set({ intent: null });
  },

  async consumeAndReplay(router) {
    const { intent, clearIntent } = get();

    if (intent?.returnPath) {
      router.replace(intent.returnPath);
    } else {
      router.replace("/(tabs)");
    }

    if (intent?.replay) {
      await intent.replay();
    }

    clearIntent();
  },
}));
