/**
 * Push provider credential parsing.
 *
 * Provider private keys arrive as single-line environment variables where the
 * PEM newlines are escaped (`\n`) and the value is often shell-quoted. Parsing
 * must therefore be explicit, and it must never echo key material: every error
 * raised here describes the variable, never its value.
 */

export class InvalidPushCredentialError extends Error {
  constructor(
    readonly variable: string,
    reason: string,
  ) {
    super(`${variable} ${reason}`);
    this.name = "InvalidPushCredentialError";
  }
}

const PEM_BEGIN = "-----BEGIN";
const PEM_END = "-----END";

/**
 * Turns an escaped, possibly quoted environment value into a usable PEM block.
 * Never include the returned value in logs or error messages.
 */
export function normalizePrivateKey(variable: string, raw: string): string {
  const unquoted = stripWrappingQuotes(raw.trim());
  const normalized = unquoted
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (normalized === "") {
    throw new InvalidPushCredentialError(variable, "is empty");
  }

  if (!normalized.includes(PEM_BEGIN) || !normalized.includes(PEM_END)) {
    throw new InvalidPushCredentialError(
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

export interface FcmCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface ApnsCredentials {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
}

export type CredentialReader = (name: string) => string | undefined;

function requireValue(read: CredentialReader, name: string): string {
  const value = read(name)?.trim();
  if (value === undefined || value === "") {
    throw new InvalidPushCredentialError(name, "is required for PUSH_TRANSPORT=fcm-apns");
  }
  return value;
}

export function readFcmCredentials(read: CredentialReader): FcmCredentials {
  return {
    projectId: requireValue(read, "FCM_PROJECT_ID"),
    clientEmail: requireValue(read, "FCM_CLIENT_EMAIL"),
    privateKey: normalizePrivateKey(
      "FCM_PRIVATE_KEY",
      requireValue(read, "FCM_PRIVATE_KEY"),
    ),
  };
}

export function readApnsCredentials(
  read: CredentialReader,
  production: boolean,
): ApnsCredentials {
  return {
    keyId: requireValue(read, "APNS_KEY_ID"),
    teamId: requireValue(read, "APNS_TEAM_ID"),
    bundleId: requireValue(read, "APNS_BUNDLE_ID"),
    privateKey: normalizePrivateKey(
      "APNS_PRIVATE_KEY",
      requireValue(read, "APNS_PRIVATE_KEY"),
    ),
    production,
  };
}
