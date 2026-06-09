import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { type Locale, resolveLocale } from "../i18n/resources";

const LOCALE_STORAGE_KEY = "@auto-tm/locale";

interface LocaleStoreState {
  locale: Locale | null;
  setLocale(locale: Locale): void;
  hydrate(): Promise<void>;
}

export const localeStore = create<LocaleStoreState>()((set) => ({
  locale: null,

  setLocale(locale) {
    set({ locale });
    void AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  },

  async hydrate() {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    const locale = resolveLocale(stored);
    set({ locale });
  },
}));
