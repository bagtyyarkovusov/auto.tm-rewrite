export function publicWebUrl(_path: string): string {
  throw new Error("Public web URL configuration is not implemented");
}

export function legalPageUrl(locale: string, kind: "privacy" | "terms" | "deletion"): string {
  return publicWebUrl(`/${locale}/${kind === "deletion" ? "account/delete" : `legal/${kind}`}`);
}
