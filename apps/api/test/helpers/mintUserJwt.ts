import { sign } from "jsonwebtoken";

export function mintUserJwt(userId: string): string {
  return sign(
    { sub: userId, role: "buyer" },
    process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
    { expiresIn: "1h" },
  );
}
