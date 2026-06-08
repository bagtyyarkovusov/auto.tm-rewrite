import { sign } from "jsonwebtoken";

export function mintAdminJwt(userId: string, sid?: string): string {
  const payload: Record<string, string> = { sub: userId, role: "admin" };
  if (sid) payload["sid"] = sid;
  return sign(
    payload,
    process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
    { expiresIn: "1h" },
  );
}
