import { requireAuthWithReturnTo } from "../actions";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth gate: checks TOTP elevation via API; redirects to login or TOTP verify on failure
  await requireAuthWithReturnTo(undefined);
  return <>{children}</>;
}
