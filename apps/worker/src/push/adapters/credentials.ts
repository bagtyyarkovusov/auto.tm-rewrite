/**
 * Push provider credential assembly.
 *
 * Provider private keys arrive as single-line environment variables where the
 * PEM newlines are escaped and the value is often shell-quoted; parsing lives
 * in `src/shared/pem.ts` because boot-time env validation needs it too. Errors
 * raised here describe the variable, never its value.
 */
import { normalizePrivateKey } from "../../shared/pem";

export class InvalidPushCredentialError extends Error {
  constructor(
    readonly variable: string,
    reason: string,
  ) {
    super(`${variable} ${reason}`);
    this.name = "InvalidPushCredentialError";
  }
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
    throw new InvalidPushCredentialError(
      name,
      "is required for PUSH_TRANSPORT=fcm-apns",
    );
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

/**
 * `production` selects the APNS host. It is read from `APNS_PRODUCTION` rather
 * than derived from `APP_ENV`: EAS `internal` distribution signs iOS builds
 * with production entitlements, so a staging deployment can legitimately hold
 * production APNS tokens. Guessing the wrong host returns `BadDeviceToken`,
 * which would deactivate every healthy iOS device.
 */
export function readApnsCredentials(read: CredentialReader): ApnsCredentials {
  return {
    keyId: requireValue(read, "APNS_KEY_ID"),
    teamId: requireValue(read, "APNS_TEAM_ID"),
    bundleId: requireValue(read, "APNS_BUNDLE_ID"),
    privateKey: normalizePrivateKey(
      "APNS_PRIVATE_KEY",
      requireValue(read, "APNS_PRIVATE_KEY"),
    ),
    production: requireValue(read, "APNS_PRODUCTION") === "true",
  };
}
