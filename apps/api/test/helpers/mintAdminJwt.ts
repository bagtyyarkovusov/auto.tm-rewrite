import { sign } from "jsonwebtoken";

export function mintAdminJwt(userId: string): string {
  return sign(
    { sub: userId, role: "admin" },
    process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
    { expiresIn: "1h" },
  );
}
