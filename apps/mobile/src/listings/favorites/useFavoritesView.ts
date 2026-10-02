import { create } from "zustand";

// Red checkpoint stub: the behaviour arrives with the implementation.
export const useHideSoldStore = create<{ hideSold: boolean }>(() => ({ hideSold: true }));
