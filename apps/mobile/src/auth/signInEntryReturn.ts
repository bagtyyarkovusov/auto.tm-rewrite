import type { SignInMethod } from "../../components/auth/SignInMethodTabs";

// Only the mounted sign-in entry registers here. Values stay local to that
// screen; no account attachment state, credentials or intent live in this bridge.
let selectMethod: ((method: SignInMethod) => void) | null = null;

export function registerSignInEntryReturn(select: (method: SignInMethod) => void) {
  selectMethod = select;
  return () => {
    if (selectMethod === select) selectMethod = null;
  };
}

export function selectMountedSignInEntry(method: SignInMethod): boolean {
  if (!selectMethod) return false;
  selectMethod(method);
  return true;
}
