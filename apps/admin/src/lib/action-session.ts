import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_EXPIRED_HEADER } from "./auth-cookie-options";
import { ADMIN_RETURN_TO_HEADER, validateReturnTo } from "./validators";

/** First step of every action; proxy strips caller input and owns this marker. */
export async function rejectExpiredSession(): Promise<void> {
  const incoming = await headers();
  if (incoming.get(SESSION_EXPIRED_HEADER) !== "1") return;
  const login = new URL("/login", "http://localhost");
  login.searchParams.set("reason", "session-expired");
  const returnTo = validateReturnTo(incoming.get(ADMIN_RETURN_TO_HEADER));
  if (returnTo) login.searchParams.set("returnTo", returnTo);
  // Let Next produce its native action redirect, including client navigation.
  redirect(login.pathname + login.search);
}
