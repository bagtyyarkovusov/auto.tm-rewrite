import type { SignInMethod } from "../../components/auth/SignInMethodTabs";

// Only mounted sign-in entries register here. Values stay local to each
// screen; no account attachment state, credentials or intent live in this
// bridge. Entries form a stack: the newest mounted entry answers a Code
// return, and unmounting it hands back to the older one beneath it.
const entries: Array<(method: SignInMethod) => void> = [];

export function registerSignInEntryReturn(select: (method: SignInMethod) => void) {
  entries.push(select);
  return () => {
    const index = entries.lastIndexOf(select);
    if (index >= 0) entries.splice(index, 1);
  };
}

export function selectMountedSignInEntry(method: SignInMethod): boolean {
  const select = entries[entries.length - 1];
  if (!select) return false;
  select(method);
  return true;
}

export function hasMountedSignInEntry(): boolean {
  return entries.length > 0;
}
