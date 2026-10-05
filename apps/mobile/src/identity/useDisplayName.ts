import { useCallback } from "react";
import { IdentitySchemas } from "@auto-tm/contracts";
import { useTranslation } from "react-i18next";

import { resolveLocale } from "../i18n/resources";

export interface NamedUser {
  displayName: string | null;
  nameNumber: number;
}

/**
 * Returns the function that names a User in the current app language: the
 * name they set, or their Generated Name ("Driver 4821"). A component that
 * calls it re-renders, with the new prefix, when the language changes.
 */
export function useDisplayName(): (user: NamedUser) => string {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  return useCallback((user: NamedUser) => IdentitySchemas.formatDisplayName(user, locale), [locale]);
}
