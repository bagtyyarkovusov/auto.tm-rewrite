import { headers } from "next/headers";

import { requireAuthWithReturnTo } from "../actions";

import { ADMIN_RETURN_TO_HEADER } from "@/lib/validators";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth gate: checks TOTP elevation via API; redirects to login or TOTP verify on failure
  const returnTo = (await headers()).get(ADMIN_RETURN_TO_HEADER);
  await requireAuthWithReturnTo(returnTo);
  return <>{children}</>;
}
