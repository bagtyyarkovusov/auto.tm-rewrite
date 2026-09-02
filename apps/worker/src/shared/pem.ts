/**
 * PEM private-key parsing shared by boot-time env validation and the push
 * adapters. Feature-agnostic on purpose: `env.schema.ts` validates secrets
 * before any Nest module exists, so it must not import into a feature folder.
 *
 * Nothing here may echo key material — every error names the variable only.
 */

export class InvalidPrivateKeyError extends Error {
  constructor(
    readonly variable: string,
    reason: string,
  ) {
    super(`${variable} ${reason}`);
    this.name = "InvalidPrivateKeyError";
  }
}

const PEM_BEGIN = "-----BEGIN";
const PEM_END = "-----END";

/**
 * Turns an escaped, possibly shell-quoted environment value into a usable PEM
 * block. Never include the returned value in logs or error messages.
 */
export function normalizePrivateKey(variable: string, raw: string): string {
  const unquoted = stripWrappingQuotes(raw.trim());
  const normalized = unquoted
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (normalized === "") {
    throw new InvalidPrivateKeyError(variable, "is empty");
  }

  if (!normalized.includes(PEM_BEGIN) || !normalized.includes(PEM_END)) {
    throw new InvalidPrivateKeyError(
      variable,
      "is not a PEM private key block",
    );
  }

  return `${normalized}\n`;
}

function stripWrappingQuotes(value: string): string {
  const isWrapped =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")));

  return isWrapped ? value.slice(1, -1) : value;
}
