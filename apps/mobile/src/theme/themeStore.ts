import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const THEME_STORAGE_KEY = "@auto-tm/theme";

export type ThemePreference = "light" | "dark" | "system";

const themes: ThemePreference[] = ["light", "dark", "system"];

export function resolveThemePreference(value: unknown): ThemePreference {
  return themes.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "system";
}

interface ThemeStoreState {
  theme: ThemePreference;
  setTheme(theme: ThemePreference): void;
  hydrate(): Promise<void>;
}

export const themeStore = create<ThemeStoreState>()((set) => ({
  theme: "system",

  setTheme(theme) {
    set({ theme });
    void AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  },

  async hydrate() {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    const theme = resolveThemePreference(stored);
    set({ theme });
  },
}));
