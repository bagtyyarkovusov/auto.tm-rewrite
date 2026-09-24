import { AuthSchemas } from "@auto-tm/contracts";

export function normalizeEmail(value: string): string | null {
  const parsed = AuthSchemas.OtpRequestRequestSchema.safeParse({ email: value });

  if (!parsed.success || !("email" in parsed.data)) {
    return null;
  }

  return parsed.data.email;
}
