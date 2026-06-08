import QRCode from "qrcode";

/**
 * Generate a QR code data URL from an otpauth URI.
 * Runs server-side only so the TOTP secret never enters the client bundle.
 */
export async function generateTotpQrCodeDataUrl(
  otpauthUrl: string,
): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 256,
    errorCorrectionLevel: "M",
  });
}
