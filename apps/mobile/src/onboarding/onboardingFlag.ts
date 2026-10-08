import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "@auto-tm/onboarding-completed";

const listeners = new Set<(completed: boolean) => void>();

export function subscribeOnboardingCompleted(listener: (completed: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  return value === "true";
}

export async function setOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  listeners.forEach((listener) => listener(true));
}

export async function resetOnboardingCompleted(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  listeners.forEach((listener) => listener(false));
}
