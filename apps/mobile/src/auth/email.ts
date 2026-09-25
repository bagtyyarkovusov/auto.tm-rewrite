import { AuthSchemas } from "@auto-tm/contracts";

export function normalizeEmail(value: string): string | null {
  const parsed = AuthSchemas.OtpRequestRequestSchema.safeParse({ email: value });

  if (!parsed.success || !("email" in parsed.data)) {
    return null;
  }

  return parsed.data.email;
}

// Profile shows Sign-in Methods masked: the first character of the local part
// stays so the User can tell addresses apart, the domain stays whole.
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;

  return `${email.charAt(0)}•••${email.slice(at)}`;
}
