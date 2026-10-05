import type { TFunction } from "i18next";

/** Why a publish did not go through, as Check and publish words it. */
export type PublishFailure = "offline" | "rateMissing" | "server";

export function publishFailureOf(_error: unknown): PublishFailure {
  return "server";
}

export function publishFailureMessage(_t: TFunction, _failure: string | null, _currency?: string): string {
  return "";
}
