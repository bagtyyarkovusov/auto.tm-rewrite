import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_KEY = "@auto-tm/onboarding-completed";
const COMPLETED = "true";
const PENDING = "pending";

/**
 * `pending`: this install is owed onboarding and has not finished it.
 * `completed`: onboarding was finished, skipped, or never owed.
 * `null`: nothing stored, so the launch gate has not decided yet.
 */
export type OnboardingFlag = "completed" | "pending" | null;

export async function readOnboardingFlag(): Promise<OnboardingFlag> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (value === COMPLETED) return "completed";
  return value === PENDING ? "pending" : null;
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, COMPLETED);
}

export async function setOnboardingPending(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, PENDING);
}
